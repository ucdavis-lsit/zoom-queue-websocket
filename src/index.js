require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const wss = require( './services/websocket.service.js' );
const dbclient = require('./services/database.service.js');

const fetch = require('node-fetch');
const api_url = process.env.API_URL;
const api_key = process.env.API_KEY;


// Express app
const app = express();

server = app.listen(80);
server.on('upgrade', (request, socket, head) => {
	wss.handleUpgrade(request, socket, head, socket => {
		wss.emit('connection', socket, request);
	});
});


// Express routes
const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).send('Ok');
});

app.use("", router)


dbclient.on('notification', async function (msg) {
	console.log("New notification",msg)
	if( msg.channel === 'guests' ){
		const payload = JSON.parse(msg.payload);
		const guest = payload.data
		console.log(guest)

		wss.clients.forEach(( wsClient ) => {
			console.log("wsclient info",wsClient.domain,wsClient.email,wsClient.is_agent)
			if( guest.domain == wsClient.domain){
				const guest_event = {
					"event": "refresh_guest_list",
				}
				wsClient.send(JSON.stringify(guest_event));
			}
			console.log("Conditions")
			console.log(guest.email,wsClient.email)
			console.log(!wsClient.is_agent,guest.email === wsClient.email,payload.type === 'update',guest.status ===  'queued',guest.match_data === null)
			console.log("Conditions end")
			if( !wsClient.is_agent && guest.email === wsClient.email && payload.type === 'update' && guest.status === 'queued' && guest.match_data === null){
				console.log("sending requeued event")
				const guest_requeued_event = {
					'event': 'guest_requeued'
				}
				//wsClient.send(JSON.stringify(guest_requeued_event));
			}
		});
	} else if ( msg.channel === 'announcements' ){
		const domain = JSON.parse(msg.payload).data.domain;
		wss.clients.forEach(( wsClient ) => {
			console.log("wsclient info",wsClient.domain,wsClient.email)
			if( domain == wsClient.domain){
				const announcement_event = {
					"event": "refresh_announcements",
				}
				console.log("sending",JSON.stringify(announcement_event))
				wsClient.send(JSON.stringify(announcement_event));
			}
		});
	}
});