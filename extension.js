let _extensionAPI;
var _inflight = new Set();
var _commandLabels = [];

var MAX_WEBHOOKS = 10;
var SLOT_ITEMS = Array.from({ length: MAX_WEBHOOKS }, (_, i) => String(i + 1));

function slotSuffix(slot) {
    return slot === 1 ? "" : String(slot);
}

function classifyService(url) {
    if (!url) return null;
    if (/maker\.ifttt\.com/.test(url)) return "ifttt";
    if (/hooks\.zapier\.com/.test(url)) return "zapier";
    if (/hook\.(?:[a-z]+\d+\.)?make\.com/.test(url)) return "make";
    if (/pipedream\.net/.test(url)) return "pipedream";
    return "other";
}

function getWebhookConfig(slot) {
    if (!_extensionAPI) return null;
    var s = slotSuffix(slot);
    var url = _extensionAPI.settings.get("jsonWH-webhook" + s);
    if (!url) return null;
    var delimiter = _extensionAPI.settings.get("jsonWH-delimiter" + s) || ":";
    var tagRaw = _extensionAPI.settings.get("jsonWH-tag" + s);
    var tag = (tagRaw && tagRaw !== "e.g. #sent (leave blank to ignore)" && tagRaw !== "") ? tagRaw : null;
    var labelRaw = _extensionAPI.settings.get("jsonWH-label" + s);
    var label = (labelRaw && labelRaw !== "") ? labelRaw : null;
    return { url, delimiter, tag, label, service: classifyService(url) };
}

function resolveWebhookSlot(webhook) {
    if (!webhook) return 1;
    var input = String(webhook).trim();
    // Try label match first (case-insensitive)
    for (var slot = 1; slot <= MAX_WEBHOOKS; slot++) {
        var cfg = getWebhookConfig(slot);
        if (cfg && cfg.label && cfg.label.toLowerCase() === input.toLowerCase()) return slot;
    }
    // Fall back to numeric slot
    var n = Math.round(Number(input));
    if (!isNaN(n) && n >= 1 && n <= MAX_WEBHOOKS) return n;
    return null;
}

async function jsonWH(uid, which) {
    var cfg = getWebhookConfig(which);
    if (!cfg) {
        return { error: "No webhook configured for slot " + which };
    }

    var url = cfg.url;
    var delimiter = cfg.delimiter;
    var tag = cfg.tag;
    var service = cfg.service;

    if (_inflight.has(uid)) return { error: "Send already in progress for this block" };
    _inflight.add(uid);

    try {
        var thisBlockInfo = window.roamAlphaAPI.data.pull("[:block/string :block/uid]", [":block/uid", uid]);
        if (!thisBlockInfo) {
            return { error: "Block not found: " + uid };
        }

        var apiCall = `[:find ?ancestor (pull ?block [:block/string])
                :in $ ?b
                :where [?ancestor :block/uid ?b]

                       [?ancestor :block/string]

                       [?block :block/parents ?ancestor]]`;

        var childBlocks = await window.roamAlphaAPI.q(apiCall, uid);

        var blocks = {};
        if (service !== "ifttt") {
            blocks['parentText'] = thisBlockInfo[":block/string"];
        } else {
            blocks['value1'] = thisBlockInfo[":block/string"];
        }

        var n = 0;
        for (var i = 0; i < childBlocks.length; i++) {
            var dataString = childBlocks[i][1].string;
            if (dataString.includes(delimiter)) {
                var parts = dataString.split(delimiter);
                var key = parts[0].trim();
                var val = parts.slice(1).join(delimiter).trim();
                if (service === "ifttt" && (i < 2)) {
                    var iftttNumber = parseInt(i) + 2;
                    blocks['value' + iftttNumber + ''] = encodeURIComponent(val);
                }
                else if (service !== "ifttt") {
                    blocks['' + key + ''] = val;
                }
            } else {
                if (service === "ifttt" && (i < 2)) {
                    var iftttNumber = parseInt(i) + 2;
                    blocks['value' + iftttNumber + ''] = encodeURIComponent(dataString);
                }
                else if (service !== "ifttt") {
                    n = n + 1;
                    blocks['string' + n] = dataString;
                }
            }
        }

        var myHeaders = new Headers();
        var requestOptions = {};
        var iftttURL;
        if (service === "zapier") {
            requestOptions["body"] = JSON.stringify(blocks);
        } else if (service === "ifttt") {
            iftttURL = url + "?value1=" + encodeURIComponent(blocks['value1']) + "&value2=" + blocks['value2'] + "&value3=" + blocks['value3'];
            requestOptions["mode"] = "no-cors";
        } else if (service === "make" || service === "pipedream") {
            myHeaders.append("Content-Type", "application/json");
            requestOptions["headers"] = myHeaders;
            requestOptions["body"] = JSON.stringify(blocks);
        } else {
            requestOptions["body"] = JSON.stringify(blocks);
        }
        requestOptions["method"] = "POST";
        requestOptions["redirect"] = "follow";

        if (service === "ifttt") {
            await fetch(iftttURL, requestOptions);
            console.log("JSON to webhooks - sent");
            if (tag != null) {
                var fresh = window.roamAlphaAPI.data.pull("[:block/string]", [":block/uid", uid]);
                await window.roamAlphaAPI.updateBlock({
                    "block":
                    {
                        "uid": uid,
                        "string": (fresh?.[":block/string"] || thisBlockInfo[":block/string"]) + " " + tag
                    }
                });
            }
            return { success: true, blockText: thisBlockInfo[":block/string"], confirmationTag: tag || null };
        } else {
            const response = await fetch(url, requestOptions);
            if (response.ok) {
                console.log("JSON to webhooks - sent");
                if (tag != null) {
                    var fresh = window.roamAlphaAPI.data.pull("[:block/string]", [":block/uid", uid]);
                    await window.roamAlphaAPI.updateBlock({
                        "block":
                        {
                            "uid": uid,
                            "string": (fresh?.[":block/string"] || thisBlockInfo[":block/string"]) + " " + tag
                        }
                    });
                }
                return { success: true, blockText: thisBlockInfo[":block/string"], confirmationTag: tag || null };
            } else {
                var errText = "";
                try { errText = await response.text(); } catch (_) {}
                console.error("JSON to webhooks - error " + response.status, errText);
                return { error: "Webhook returned " + response.status };
            }
        }
    } catch (err) {
        console.error("JSON to webhooks - error:", err);
        return { error: err.message || "Unknown error" };
    } finally {
        _inflight.delete(uid);
    }
}

function buildSettingsConfig(extensionAPI, count) {
    if (count === undefined) {
        var stored = parseInt(extensionAPI.settings.get("jsonWH-count"));
        count = (stored >= 1 && stored <= MAX_WEBHOOKS) ? stored : 1;
    }

    var settings = [
        {
            id: "jsonWH-count",
            name: "Number of webhooks",
            description: "How many webhook destinations to configure.",
            action: {
                type: "select",
                items: SLOT_ITEMS,
                onChange: (value) => {
                    extensionAPI.settings.set("jsonWH-count", value);
                    extensionAPI.settings.panel.create(buildSettingsConfig(extensionAPI, parseInt(value)));
                    alert("Reload the extension to update the Command Palette with the new webhook count.");
                },
            },
        },
    ];

    for (var slot = 1; slot <= count; slot++) {
        var s = slotSuffix(slot);
        var n = slot;
        settings.push(
            {
                id: "jsonWH-label" + s,
                name: "Webhook #" + n + " Label",
                description: "A friendly name for this webhook (e.g. \"Zapier tasks\").",
                action: { type: "input", placeholder: "e.g. Zapier tasks", onChange: () => alert("Reload the extension to update the Command Palette with the new label.") },
            },
            {
                id: "jsonWH-webhook" + s,
                name: "Webhook #" + n + " Address",
                description: "Paste your webhook URL here.",
                action: { type: "input", placeholder: "Place webhook address here" },
            },
            {
                id: "jsonWH-delimiter" + s,
                name: "Webhook #" + n + " Delimiter",
                description: "The character that separates key from value in each child block.",
                action: { type: "input", placeholder: ":" },
            },
            {
                id: "jsonWH-tag" + s,
                name: "Webhook #" + n + " Confirmation tag",
                description: "(Optional) Tag or string appended to the block on successful send.",
                action: { type: "input", placeholder: "e.g. #sent (leave blank to ignore)" },
            }
        );
    }

    return {
        tabTitle: "JSON to Webhooks",
        settings: settings,
    };
}

export default {
    onload: ({ extensionAPI }) => {
        _extensionAPI = extensionAPI;

        // Migration: if count not yet set, detect from existing config
        if (!extensionAPI.settings.get("jsonWH-count")) {
            var migratedCount = 1;
            for (var s = 2; s <= MAX_WEBHOOKS; s++) {
                if (extensionAPI.settings.get("jsonWH-webhook" + s)) { migratedCount = s; }
            }
            extensionAPI.settings.set("jsonWH-count", String(migratedCount));
        }

        extensionAPI.settings.panel.create(buildSettingsConfig(extensionAPI));

        var activeCount = parseInt(extensionAPI.settings.get("jsonWH-count")) || 1;
        _commandLabels = [];
        for (var slot = 1; slot <= activeCount; slot++) {
            (function(s) {
                var labelRaw = extensionAPI.settings.get("jsonWH-label" + slotSuffix(s));
                var cmdLabel = (labelRaw && labelRaw !== "")
                    ? "JSON to Webhook: " + labelRaw
                    : "JSON to Webhook #" + s;
                _commandLabels[s] = cmdLabel;
                window.roamAlphaAPI.ui.commandPalette.addCommand({
                    label: cmdLabel,
                    callback: () => {
                        const uid = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
                        if (uid == undefined) {
                            alert("Please make sure to focus a block before trying to send data to a webhook");
                            return;
                        }
                        if (!getWebhookConfig(s)) { sendConfigAlert(); return; }
                        jsonWH(uid, s);
                    }
                });
            })(slot);
        }

        window.RoamExtensionTools = window.RoamExtensionTools || {};
        window.RoamExtensionTools["json-webhooks"] = {
            name: "JSON Webhooks",
            version: "1.0",
            tools: [
                {
                    name: "jw_get_config",
                    readOnly: true,
                    description: "Get configured webhook endpoints, their labels, service types, delimiters, and confirmation tag settings.",
                    parameters: { type: "object", properties: {} },
                    execute: async () => {
                        var webhooks = [];
                        for (var slot = 1; slot <= MAX_WEBHOOKS; slot++) {
                            var cfg = getWebhookConfig(slot);
                            if (cfg) {
                                webhooks.push({
                                    slot: slot,
                                    label: cfg.label || null,
                                    service: cfg.service,
                                    delimiter: cfg.delimiter,
                                    hasConfirmationTag: !!cfg.tag
                                });
                            }
                        }
                        return { webhooks: webhooks };
                    }
                },
                {
                    name: "jw_send",
                    readOnly: false,
                    description: "Send a Roam block and its children as JSON to a configured webhook endpoint.",
                    parameters: {
                        type: "object",
                        properties: {
                            uid: { type: "string", description: "Block UID to send." },
                            webhook: { type: "string", description: "Webhook label (e.g. \"Zapier tasks\") or slot number (1–10). Default 1. Use jw_get_config to discover available webhooks and their labels." }
                        },
                        required: ["uid"]
                    },
                    execute: async (args) => {
                        if (!args || !args.uid) return { error: "uid is required" };
                        var slot = resolveWebhookSlot(args.webhook);
                        if (slot === null) return { error: "No configured webhook found matching: " + args.webhook };
                        return await jsonWH(args.uid, slot);
                    }
                }
            ]
        };
    },
    onunload: () => {
        for (var slot = 1; slot <= MAX_WEBHOOKS; slot++) {
            if (_commandLabels[slot]) {
                window.roamAlphaAPI.ui.commandPalette.removeCommand({ label: _commandLabels[slot] });
            }
        }
        _commandLabels = [];
        delete window.RoamExtensionTools?.["json-webhooks"];
        _inflight.clear();
        _extensionAPI = null;
    }
};

function sendConfigAlert() {
    alert("Please set your webhook address via the Roam Depot tab.");
}
