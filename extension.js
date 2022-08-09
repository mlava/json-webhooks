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
    ]
};

export default {
    onload: ({ extensionAPI }) => {
        extensionAPI.settings.panel.create(config);

        window.roamAlphaAPI.ui.commandPalette.addCommand({
            label: "JSON to Webhook",
            callback: () => jsonWH()
        });

        async function jsonWH() {
            if (!extensionAPI.settings.get("jsonWH-webhook")) {
                sendConfigAlert();
            } else if (!extensionAPI.settings.get("jsonWH-delimiter")) {
                sendConfigAlert();
            } else {
                const WebhookURL = extensionAPI.settings.get("jsonWH-webhook");
                const WebhookDelimiter = extensionAPI.settings.get("jsonWH-delimiter");
                var dataString;
                const startBlock = await window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];

                let q = `[:find (pull ?page [:block/string]) :where [?page :block/uid "${startBlock}"]  ]`;
                var thisBlockInfo = await window.roamAlphaAPI.q(q);

                var apiCall = `[:find ?ancestor (pull ?block [*])
                :in $ ?b
                :where [?ancestor :block/uid ?b]

                       [?ancestor :block/string]

                       [?block :block/parents ?ancestor]]`;

                var childBlocks = await window.roamAlphaAPI.q(apiCall, startBlock);

                var blocks = {};
                var parentString = thisBlockInfo[0][0].string;

                if (!WebhookURL.match("ifttt")) {
                    blocks['parentText'] = parentString;
                } else {
                    blocks['value1'] = parentString;
                }

                var n = 0;
                for (var i in childBlocks) {
                    dataString = childBlocks[i][1].string;
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
                }

                var myHeaders = new Headers();
                var requestOptions = {};
                if (WebhookURL.match("zapier")) {
                    requestOptions["body"] = JSON.stringify(blocks);
                } else if (WebhookURL.match("ifttt")) {
                    var iftttURL = WebhookURL + "?value1=" + blocks['value1'] + "&value2=" + blocks['value2'] + "&value3=" + blocks['value3'];
                } else if (WebhookURL.match("make") || WebhookURL.match("pipedream")) {
                    myHeaders.append("Content-Type", "application/json");
                    requestOptions["headers"] = myHeaders;
                    requestOptions["body"] = JSON.stringify(blocks);
                } else {
                    requestOptions["body"] = JSON.stringify(blocks);
                }
                requestOptions["method"] = "POST";
                requestOptions["redirect"] = "follow";

                if (WebhookURL.match("ifttt")) {
                    const response = await fetch(iftttURL, requestOptions)
                    const data = await response.json();
                    if (response.ok) {
                        console.log("JSON to webhooks - sent")
                    } else {
                        console.error(data);
                    }
                } else {
                    const response = await fetch(WebhookURL, requestOptions);
                    const data = await response.json();
                    if (response.ok) {
                        console.log("JSON to webhooks - sent")
                    } else {
                        console.error(data);
                    }
                }
            };
        }
    },
    onunload: () => {
        window.roamAlphaAPI.ui.commandPalette.removeCommand({
            label: 'JSON to Webhook'
        });
    }
}

function sendConfigAlert() {
    alert("Please set all required configuration settings via the Roam Depot tab.");
}