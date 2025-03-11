const express = require('express');
const { startKeywords, responsiveKeywords, testKeywords } = require('./constants');
const app = express()
const port = 3000
const securityTokens = {
    50452: 'o4i1dOGqJ4fAELQgvkBsINKZb9Jdiu63h4ZRwyLKe9978316',
};
const RESPONSIVE_URL = "https://secure.tecnomotum.com/srmotum/Apis/responsiveLetterFiles";

const getCustomMessage = async (code = null) => {
    const formatted = code?.toString()?.toUpperCase() ?? null;
    const formattedTlc = code?.toString()?.toLowerCase() ?? null;
    if (formatted?.includes("CIM") || !formatted || startKeywords.some(keyword => formattedTlc.includes(keyword))) return "Buen día.\nGracias por contactar al equipo CIM.\n¿En qué puedo ayudar?\n1: Consulta de Responsiva\n2: Agenda de pruebas";
    if (responsiveKeywords.some(keyword => formattedTlc.includes(keyword))) return 'Digite el nombre de la flota que desea saber si tiene responsiva';
    if (testKeywords.some(keyword => formattedTlc.includes(keyword))) return "En breve, el equipo CIM se pondrá en contacto contigo para coordinar y agendar una cita. Gracias por su paciencia.";
    switch (formatted) {
        case '1':
            return 'Digite el nombre de la flota que desea saber si tiene responsiva';
        case '2':
            return 'En breve, el equipo CIM se pondrá en contacto contigo para coordinar y agendar una cita. Gracias por su paciencia.';
    }
    const response = await getResponsive(formatted);
    return response;
}

const getResponsive = async (fleetName = null) => {
    const response = await fetch(`${RESPONSIVE_URL}?client=${fleetName}`);
    if (!response.ok) return "Flota no disponible.\nBuen día.\nGracias por contactar al equipo CIM.\n¿En qué puedo ayudar?\n1: Consulta de Responisva\n2: Ageda de pruebas";
    const json = await response?.json() ?? null;
    if (!json || !Array.isArray(json) || json?.length === 0) return "Flota no disponible\nBuen día.\nGracias por contactar al equipo CIM.\n¿En qué puedo ayudar?\n1: Consulta de Responisva\n2: Ageda de pruebas";
    return `La responsiva del cliente ${json?.[0]?.fleetdocument} es:\n${json?.[0]?.pdfurl}`;
}

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
            const response = await getCustomMessage(messageContent) ?? 'Buen día.\nGracias por contactar al equipo CIM.\n¿En qué puedo ayudar?\n1: Consulta de Responisva\n2: Ageda de pruebas';
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
                    message: `${response}`,
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

app.get('/test', async (req, res) => {
    res.send("endpoint test");
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});