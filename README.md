This extension allows you to export data from Roam Research to a webhook. This can allow connection with services such as Zapier, IFTTT, Integromat/Make and Pipedream.

If you nest childblock data beneath a parent, click into the parent block and then trigge this extension via the Command Palette, it will read the parent and child block data and then format it to send to the defined webhook.

Note that you need to have set up whichever service you're using in advance - stepwise instructions are below.


- ## Example Items:
    - lunch with John
        - Date: tomorrow
        - Time: 1230 pm
        - Location: Rialto Towers

This clip shows how to use the data structure above to make a calendar entry: https://www.loom.com/share/ead9d2d129994cad9c00261925e7ac6d

- ## Configuration:
    - ### Zapier:
        - In Zapier, create a new Zap using the Webhooks by Zapier trigger.
            - ![](https://firebasestorage.googleapis.com/v0/b/firescript-577a2.appspot.com/o/imgs%2Fapp%2FMark_Lavercombe%2F-Qd7XmrHms.png?alt=media&token=dd4a8c0a-a13d-45e5-aa0d-ed774fb94bc9)
        - Click Continue button
        - Copy the Custom Webhook URL, leave all other options alone and click Continue again
        - Paste the Webhook URL in the Roam Depot settings for this extension
        - Go back to Zapier and click Test Trigger button
        - You should see something like this:
            - ![](https://firebasestorage.googleapis.com/v0/b/firescript-577a2.appspot.com/o/imgs%2Fapp%2FMark_Lavercombe%2FiWs6XpCUFZ.jpg?alt=media&token=11f3b339-f187-4a03-a0f4-c94290b79e4d)
        - Now, click Continue and choose what you want to do with the data... 🎉
    - ### IFTTT:
        - Although IFTT __can__ receive webhooks, there are limits in both the number and type of data that can be sent and processed. Unlike Zapier, Integromat and Pipedream, IFTT can only accept pre-defined webhook events with three json values.
        - You need to define the name of the webhook you want to call - go to [Choose a trigger - IFTTT](https://ifttt.com/create) and choose Add, then select Webhook.
        - Select Receive a web request and you will be asked to name the event.
        - Then, continue through the usual process of creating an IFTTT applet.
        - Once you have finished, go to your [Webhooks works better with IFTTT](https://ifttt.com/maker_webhooks) page and click on Documentation
        - Under Make a POST or GET web request to: you will see a url like:
        - `https://maker.ifttt.com/trigger/{event}/with/key/<long alphanumeric string>`
        - The {event} string is the name of the event you entered earlier. Type it in the {event} box to reveal the full url. 
        - Copy this url and place it in the Roam Depot settings panel.
        - For this script, the parent block will be sent as value1, and the first two child blocks will be sent as value2 and value3. Unlike the other services like Zapier, you can't define the key and are stuck with value1 etc.
        - Use value1, value2 and value3 in your IFTTT applet and enjoy! 🎉
    - ### Integromat / Make:
        - The process for Integromat is quite similar to that for Zapier
        - Create a new scenario
        - Select Webhooks and whatever app to which you want to send the data
        - In the scenario, Add Custom webhook
            - ![](https://firebasestorage.googleapis.com/v0/b/firescript-577a2.appspot.com/o/imgs%2Fapp%2FMark_Lavercombe%2Fn4far01xMD.png?alt=media&token=5f582c0b-e6d5-4afe-9a3d-672242745d9f)
        - Click the Add button to create a new webhook
        - Enter a webhook name and click Save. The Webhook item will generate a URL.
        - Place the Webhook URL in the Roam Depot settings panel
        - Click into the example item below, 'lunch with John', at the end (after 'John')
        - Trigger the extension via the Command Palette
        - Go back to Integromat. Your webhook should receive the data and offer to parse it for you.
        - Connect another app and enjoy sending it your data! 🎉
    - ### Pipedream:
        - Go to Sources, click New and select HTTP/Webhook
        - Choose New Requests (Payload Only)
        - Enter a Name and click Create Source
        - You will be shown a box with a header __Your endpoint is__
        - Place the Webhook URL in the Roam Depot settings panel
        - Click into the example item below, 'lunch with John', at the end (after 'John')
        - Trigger the extension via the Command Palette
        - In the left-sided panel a new event will appear. Click on the timestamp header and the information to the right will show the event data.
        - Click the Create Workflow button to connect your data to another app and enjoy! 🎉
    - ### Choice of Delimiter:
        - Choose which delimiter you wish to use to separate the child block key:value pairs.
            - For example, you could use Date: Tomorrow which uses : as the delimiter
            - The script will then send a key:value pair of key "Date" and value "Tomorrow" in the json data
            - You could choose any sequence of characters, like ;: or even just ,
            - e.g.
                - Date: Tomorrow
                - Date;: Tomorrow
                - Date, Tomorrow
            - The extension will strip leading and trailing spaces so it will still appear as "Date" and "Tomorrow" in the data sent to the webhook
            - Enter your preferred delimiter in the Roam Depot settings panel
        - You might choose to have some simple text fields without a delimiter. In this case, they will be sent as a key:value pair of "string__n__":"__string of text__"
            - You can mix and match with some child blocks having simple text and others having delimited text.
            - Note: for IFTTT your text will be sent as "value__n__":"__string of text__"
        - Finally, you don't have to use child blocks. If you trigger the SB in a block without children it will simply send a single key:value pair of "parentText" and the text in the block as the value.
