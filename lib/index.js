const url = require('url');
const https = require('https');
class SlackApi{
	constructor(opts={}){
		this.options = {
			SLACK_TOKEN: opts.SLACK_TOKEN,
			DEBUG: opts.SLACK_TOKEN || false
		};
	}
	async sendAttachmentsTo(users,attachments){
		let message_data = {
			"users": users,
			"attachments": attachments
		};
		message_data.channel = await this.openSlackChannel(users);
		return await this.postSlackMessage(message_data);
	}
	async sendMessageTo(users,message){
		let message_data = {
			"users": users,
			"text":message
		};
		message_data.channel = await this.openSlackChannel(users);
		return await this.postSlackMessage(message_data);
	}
	openSlackChannel(users){
		let options = url.parse("https://slack.com/api/conversations.open?token=" + this.options.SLACK_TOKEN + "&users=" + users);
		options.method = "GET";
		return new Promise((resolve, reject) => {
			let slack_open_dm = https.request(options, (slack_open_dm_res) => {
				let channel_id;
				let body = '';
				let json_body;
				slack_open_dm_res.on('data', (chunk)=>{ // read each chunk of data recieved into buffer
					body+=chunk;
				});
				slack_open_dm_res.on('end', ()=>{
					// console.log("Got JSON Body",body);
					try {
						json_body = JSON.parse(body);
						channel_id = json_body.channel.id;
					} catch (e) {
						if(json_body !== undefined && json_body.error){
							reject(new Error(json_body.error,400));
						}else{
							reject(e);
						}
					}
					resolve(channel_id);
				})
			});
			slack_open_dm.on('error', (error)=>{
				throw new Error("Could not open Slack Converation");
			});
			slack_open_dm.end();
		});
	}
	postSlackMessage(message){
		message["token"] = this.options.SLACK_TOKEN;
		let url_params = Object.entries(message).map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join('&')
		if(Array.isArray(message["attachments"])){
			let attachments = message["attachments"].map(attachment => JSON.stringify(attachment));
			delete message["attachments"];
			url_params = url_params + "&attachments=" + encodeURIComponent("[" + attachments.join(" ") + "]");
		}
		let options = url.parse("https://slack.com/api/chat.postMessage?"+url_params);
		return new Promise((resolve, reject) => {
			const slack_post_msg = https.request(options, (slack_post_msg_res) => {
				let response = '';
				slack_post_msg_res.on('data', function(data){
					response += data;
				});
				slack_post_msg_res.on('end', function(data){
					try{
						let result = JSON.parse(response);
						resolve(result);
					}catch(e){
						resolve({result:"Failed to parse response",response:response});
					}
				});
			});
			slack_post_msg.on('error', (error) => {
				reject(new Error("Could not send Slack Notification: " + JSON.stringify(error)));
			})
			slack_post_msg.write(JSON.stringify(message));
			slack_post_msg.end();
		});
	}
}

module.exports = SlackApi;
