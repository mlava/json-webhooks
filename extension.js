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
            const WebhookURL = extensionAPI.settings.get("jsonWH-webhook");
            const WebhookDelimiter = extensionAPI.settings.get("jsonWH-delimiter");
            const startBlock = await window.roamAlphaAPI.ui.getFocusedBlock()?.["block-uid"];
            var dataString;

            var apiCall = '[ :find ?ancestor (pull ?block [*]) :where  [?ancestor :block/uid \"' + startBlock + '\"] [?ancestor :block/string] [?block :block/parents ?ancestor]]';
            let q = `[:find (pull ?page
                     [:node/title :block/string :block/uid :block/heading :block/props 
                      :entity/attrs :block/open :block/text-align :children/view-type
                      :block/order
                     ])
                  :where [?page :block/uid "${startBlock}"]  ]`;
            var thisBlockInfo = await window.roamAlphaAPI.q(q);
            var childBlocks = await window.roamAlphaAPI.q(apiCall);
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

            var settings = {
                "url": WebhookURL,
                "method": "POST",
                "timeout": 0
            };
            if (WebhookURL.match("zapier")) {
                settings['data'] = JSON.stringify(blocks);
            }  else if (WebhookURL.match("ifttt")) {
                settings['url'] = WebhookURL+"?value1="+blocks['value1']+"&value2="+blocks['value2']+"&value3="+blocks['value3'];
            } else if (WebhookURL.match("make")) {
                settings['data'] = blocks;
            } else if (WebhookURL.match("pipedream")) {
                settings['data'] = JSON.stringify(blocks);
                settings['headers'] = "{\"Content-Type\": \"application/json\"}";
            } else {
                settings['data'] = JSON.stringify(blocks);
            }
            $.ajax(settings).done(function (response) {
                console.error(response);
            });
        };
    },
    onunload: () => {
        window.roamAlphaAPI.ui.commandPalette.removeCommand({
            label: 'JSON to Webhook'
        });
    }
}