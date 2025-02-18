const express = require('express')
const app = express()
const port = 3000
const securityTokens = {
    45918: 'LKBwZCdEgiqZYi8NJNRkuunayEgflPBLskq8pOl46c44b92b',
};

app.use(express.json());

app.post('/webhooks/whatsapp/:security_token', async (req, res) => {
    const securityToken = req.params.security_token;
    const body = req.body;
    const instanceId = body.instanceId;
    const eventName = body.event;
    const eventData = body.data;
    if (securityToken == null || instanceId == null || eventName == null || eventData == null) {
        console.log('Invalid request');
        res.sendStatus(400);
        return;
    }
    if (securityTokens[instanceId] !== securityToken) {
        console.log('Authentication failed');
        res.sendStatus(401);
        return;
    }
    if (eventName === 'message') {
        console.log('Handle message event...');
        const messageData = eventData.message;
        const messageSenderId = messageData.from;
        const messageType = messageData.type;
        if (messageType === 'chat') {
            const messageContent = messageData.body;
            const messageSenderPhoneNumber = messageSenderId;
            console.log({ messageContent });
            const options = {
                method: 'POST',
                headers: {
                    accept: 'application/json',
                    'content-type': 'application/json',
                    authorization: 'Bearer ' + securityTokens[instanceId],
                },
                body: JSON.stringify({
                    chatId: '5215520833676@c.us', // TODO: Change to ${messageSenderPhoneNumber}
                    message: `Dijiste: ${messageContent}`,
                })
            };
            fetch('https://waapi.app/api/v1/instances/' + instanceId + '/client/action/send-message', options)
                .then(response => response.json())
                .then(response => console.log(response))
                .catch(err => console.error(err));
        }
        res.sendStatus(200);
    } else {
        console.log('Cannot handle this event: ' + eventName);
        res.sendStatus(404);
    }
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});