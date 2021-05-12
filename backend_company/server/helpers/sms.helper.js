const Twilio = require('twilio');

const sendSms = async(data) => {
	let send = {
		body: data.body,
		to: data.to,
		from: '+18653200485'
	}

	var twilio = new Twilio(process.env.ACCOUNT_SID, process.env.AUTH_TOKEN);
	console.log('client', twilio)
	twilio.messages.create({
	  from: '+18653200485',
	  to: data.to,
	  body: data.body
	}, function(err, result) {
	  console.log('Created message using callback');
	  console.log(result);
	  console.log('err', err)
	});
}

const formatSmsNumber = async(code, phone) => {
	let number = null
	// code = code.split('+').join('')
	phone = phone.replace(/\/+/g, '');
	return `${ code }${ phone }`;
}

const formatSmsMessage = async(data) => {
	return `Hi ${ data.name }, your company ${ data.company } has enrolled you into the Mednefits health benefits program. Your plan will start on ${ data.plan_start }. Your Member Account Login ID is ${ data.phone } and Password is ${ data.password }. Download Mednefits App in either on Apple App Store or Android PlayStore.`;
}

module.exports = {
	sendSms,
	formatSmsNumber,
	formatSmsMessage
}