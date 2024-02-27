const config = {
    tabTitle: "JSON to Webhooks",
    settings: [
        {
            id: "jsonWH-webhook",
            name: "Webhook Address",
            description: "Place webhook address here",
            action: { type: "input", placeholder: "Place webhook address here" },
        },
        {
            id: "jsonWH-delimiter",
            name: "Delimiter",
            description: "The character that marks the beginning or end of a unit of data",
            action: { type: "input", placeholder: ":" },
        },
        {
            id: "jsonWH-tag",
            name: "Confirmation tag",
            description: "(Optional) tag or string to show on confirmation of successful post to webhook",
            action: { type: "input", placeholder: "e.g. #sent (leave blank to ignore)" },
        },
        {
            id: "jsonWH-webhook2",
            name: "Second Webhook Address (optional)",
            description: "Place webhook address here",
            action: { type: "input", placeholder: "Place webhook address here" },
        },
        {
            id: "jsonWH-delimiter2",
            name: "Second Delimiter (optional)",
            description: "The character that marks the beginning or end of a unit of data",
            action: { type: "input", placeholder: ":" },
        },
        {
            id: "jsonWH-tag2",
            name: "Confirmation tag",
            description: "(Optional) tag or string to show on confirmation of successful post to webhook",
            action: { type: "input", placeholder: "e.g. #sent (leave blank to ignore)" },
        },
    ]
};

export default {
    onload: ({ extensionAPI }) => {
        extensionAPI.settings.panel.create(config);

        window.roamAlphaAPI.ui.commandPalette.addCommand({
            label: "JSON to Webhook #1",
            callback: () => {
                const uid = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
                if (uid == undefined) {
                    alert("Please make sure to focus a block before trying to send data to a webhook");
                    return;
                }
                var which = 1;
                jsonWH(uid, which);
            }
        });
        window.roamAlphaAPI.ui.commandPalette.addCommand({
            label: "JSON to Webhook #2",
            callback: () => {
                const uid = window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
                if (uid == undefined) {
                    alert("Please make sure to focus a block before trying to send data to a webhook");
                    return;
                }
                var which = 2;
                jsonWH(uid, which);
            }
        });

        async function jsonWH(uid, which) {
            var WebhookURL, WebhookDelimiter, tagConfirmation, WebhookURL2, WebhookDelimiter2, tagConfirmation2;
            breakme: {
                if (!extensionAPI.settings.get("jsonWH-webhook")) {
                    sendConfigAlert();
                    break breakme;
                } else {
                    WebhookURL = extensionAPI.settings.get("jsonWH-webhook");
                    if (!extensionAPI.settings.get("jsonWH-delimiter")) {
                        WebhookDelimiter = ":";
                    } else {
                        WebhookDelimiter = extensionAPI.settings.get("jsonWH-delimiter");
                    }
                    if (extensionAPI.settings.get("jsonWH-tag") != "e.g. #sent (leave blank to ignore" && extensionAPI.settings.get("jsonWH-tag") != "") {
                        tagConfirmation = extensionAPI.settings.get("jsonWH-tag");
                    }

                    if (extensionAPI.settings.get("jsonWH-webhook2")) {
                        WebhookURL2 = extensionAPI.settings.get("jsonWH-webhook2");
                    }
                    if (!extensionAPI.settings.get("jsonWH-delimiter2")) {
                        WebhookDelimiter2 = ":";
                    } else {
                        WebhookDelimiter2 = extensionAPI.settings.get("jsonWH-delimiter2");
                    }
                    if (extensionAPI.settings.get("jsonWH-tag2") != "e.g. #sent (leave blank to ignore" && extensionAPI.settings.get("jsonWH-tag2") != "") {
                        tagConfirmation2 = extensionAPI.settings.get("jsonWH-tag2");
                    }

                    var dataString;
                    var thisBlockInfo = window.roamAlphaAPI.data.pull("[:block/string :block/uid]", [":block/uid", uid]);

                    var apiCall = `[:find ?ancestor (pull ?block [*])
                :in $ ?b
                :where [?ancestor :block/uid ?b]

                       [?ancestor :block/string]

                       [?block :block/parents ?ancestor]]`;

                    var childBlocks = await window.roamAlphaAPI.q(apiCall, uid);

                    var blocks = {};
                    if (which == 1) {
                        if (!WebhookURL.match("ifttt")) {
                            blocks['parentText'] = thisBlockInfo[":block/string"];
                        } else {
                            blocks['value1'] = thisBlockInfo[":block/string"];
                        }
                    } else if (which == 2) {
                        if (!WebhookURL2.match("ifttt")) {
                            blocks['parentText'] = thisBlockInfo[":block/string"];
                        } else {
                            blocks['value1'] = thisBlockInfo[":block/string"];
                        }
                    }

                    var n = 0;
                    for (var i in childBlocks) {
                        dataString = childBlocks[i][1].string;
                        if (which == 1) {
                            if (dataString.match(WebhookDelimiter)) {
                                dataString = dataString.split(WebhookDelimiter);
                                if (WebhookURL.match("ifttt") && (i < 2)) {
                                    var iftttNumber = parseInt(i) + 2;
                                    blocks['value' + iftttNumber + ''] = encodeURIComponent(dataString[1].trim());
                                }
                                else if (!WebhookURL.match("ifttt")) {
                                    blocks['' + dataString[0].trim() + ''] = dataString[1].trim();
                                }
                            } else {
                                if (WebhookURL.match("ifttt") && (i < 2)) {
                                    var iftttNumber = parseInt(i) + 2;
                                    blocks['value' + iftttNumber + ''] = encodeURIComponent(dataString);
                                }
                                else if (!WebhookURL.match("ifttt")) {
                                    n = n + 1;
                                    blocks['string' + n] = dataString;
                                }
                            }
                        } else if (which == 2) {
                            if (dataString.match(WebhookDelimiter2)) {
                                dataString = dataString.split(WebhookDelimiter2);
                                if (WebhookURL2.match("ifttt") && (i < 2)) {
                                    var iftttNumber = parseInt(i) + 2;
                                    blocks['value' + iftttNumber + ''] = encodeURIComponent(dataString[1].trim());
                                }
                                else if (!WebhookURL2.match("ifttt")) {
                                    console.info(dataString);
                                    blocks['' + dataString[0].trim() + ''] = dataString[1].trim();
                                }
                            } else {
                                if (WebhookURL2.match("ifttt") && (i < 2)) {
                                    var iftttNumber = parseInt(i) + 2;
                                    blocks['value' + iftttNumber + ''] = encodeURIComponent(dataString);
                                }
                                else if (!WebhookURL2.match("ifttt")) {
                                    n = n + 1;
                                    blocks['string' + n] = dataString;
                                }
                            }
                        }
                    }

                    var myHeaders = new Headers();
                    var requestOptions = {};
                    if (which == 1) {
                        if (WebhookURL.match("zapier")) {
                            requestOptions["body"] = JSON.stringify(blocks);
                        } else if (WebhookURL.match("ifttt")) {
                            var iftttURL = WebhookURL + "?value1=" + blocks['value1'] + "&value2=" + blocks['value2'] + "&value3=" + blocks['value3'];
                            requestOptions["mode"] = "no-cors";
                        } else if (WebhookURL.match("make") || WebhookURL.match("pipedream")) {
                            myHeaders.append("Content-Type", "application/json");
                            requestOptions["headers"] = myHeaders;
                            requestOptions["body"] = JSON.stringify(blocks);
                        } else {
                            requestOptions["body"] = JSON.stringify(blocks);
                        }
                    } else if (which == 2) {
                        if (WebhookURL2.match("zapier")) {
                            requestOptions["body"] = JSON.stringify(blocks);
                        } else if (WebhookURL2.match("ifttt")) {
                            var iftttURL = WebhookURL2 + "?value1=" + blocks['value1'] + "&value2=" + blocks['value2'] + "&value3=" + blocks['value3'];
                            requestOptions["mode"] = "no-cors";
                        } else if (WebhookURL2.match("make") || WebhookURL2.match("pipedream")) {
                            myHeaders.append("Content-Type", "application/json");
                            requestOptions["headers"] = myHeaders;
                            requestOptions["body"] = JSON.stringify(blocks);
                        } else {
                            requestOptions["body"] = JSON.stringify(blocks);
                        }
                    }
                    requestOptions["method"] = "POST";
                    requestOptions["redirect"] = "follow";

                    if (which == 1) {
                        if (WebhookURL.match("ifttt")) {
                            await fetch(iftttURL, requestOptions);
                            console.log("JSON to webhooks - sent");
                            if (tagConfirmation != null) {
                                await window.roamAlphaAPI.updateBlock({
                                    "block":
                                    {
                                        "uid": thisBlockInfo[":block/uid"],
                                        "string": thisBlockInfo[":block/string"] + " " + tagConfirmation
                                    }
                                });
                            };
                        } else {
                            const response = await fetch(WebhookURL, requestOptions);
                            if (response.ok) {
                                console.log("JSON to webhooks - sent");
                                if (tagConfirmation != null) {
                                    await window.roamAlphaAPI.updateBlock({
                                        "block":
                                        {
                                            "uid": thisBlockInfo[":block/uid"],
                                            "string": thisBlockInfo[":block/string"] + " " + tagConfirmation
                                        }
                                    });
                                };
                            } else {
                                const data = await response.json();
                                console.error(data);
                            }
                        }
                    } else if (which == 2) {
                        if (WebhookURL2.match("ifttt")) {
                            await fetch(iftttURL, requestOptions)
                            console.log("JSON to webhooks - sent");
                            if (tagConfirmation2 != null) {
                                await window.roamAlphaAPI.updateBlock({
                                    "block":
                                    {
                                        "uid": thisBlockInfo[":block/uid"],
                                        "string": thisBlockInfo[":block/string"] + " " + tagConfirmation2
                                    }
                                });
                            };
                        } else {
                            const response = await fetch(WebhookURL2, requestOptions);
                            if (response.ok) {
                                console.log("JSON to webhooks - sent");
                                if (tagConfirmation2 != null) {
                                    await window.roamAlphaAPI.updateBlock({
                                        "block":
                                        {
                                            "uid": thisBlockInfo[":block/uid"],
                                            "string": thisBlockInfo[":block/string"] + " " + tagConfirmation2
                                        }
                                    });
                                };
                            } else {
                                const data = await response.json();
                                console.error(data);
                            }
                        }
                    }
                };
            }
        }
    },
    onunload: () => {
        window.roamAlphaAPI.ui.commandPalette.removeCommand({
            label: 'JSON to Webhook #1'
        });
        window.roamAlphaAPI.ui.commandPalette.removeCommand({
            label: 'JSON to Webhook #2'
        });
    }
}

function sendConfigAlert() {
    alert("Please set your webhook address via the Roam Depot tab.");
}