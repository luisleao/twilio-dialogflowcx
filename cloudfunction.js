
// Imports the Google Cloud API library
const { SessionsClient } = require('@google-cloud/dialogflow-cx');

/*
    From, Body
*/
exports.handler = async function (context, event, callback) {
  let syncMapKey = "";
  let paramsJSON = {};

  syncMapKey = event.From.substring(event.From.lastIndexOf('+') + 1);
  paramsJSON = {
    "fields": {
      "mobile_number" : {
        "kind": "stringValue",
        "stringValue": syncMapKey
      }
    }
  };
    
  let languageCode = context.DIALOGFLOW_CX_LANGUAGE_CODE;
  let query = event.Body;

  // Google requires an environment variable called GOOGLE_APPLICATION_CREDENTIALS that points to a file path with the service account key file (json) to authenticate into their API. To solve for this, we save the key file as a private asset, then use a helper function to find and return the path of the private asset. Lastly we set the environment variable dynamically at runtime so that it's in place when the sessions client is initialized

  process.env.GOOGLE_APPLICATION_CREDENTIALS =
    Runtime.getAssets()['/service-account-key.json'].path;

  // Initialize the SessionsClient- https://googleapis.dev/nodejs/dialogflow-cx/latest/v3.SessionsClient.html
  let client = new SessionsClient({
    apiEndpoint: `${context.DIALOGFLOW_CX_LOCATION}-dialogflow.googleapis.com`,
  });

  //Setup a request object to dynamically populate for sending DetectIntentRequest to Dialogflow CX
  let request = {
    session: client.projectLocationAgentSessionPath(
      context.DIALOGFLOW_CX_PROJECT_ID,
      context.DIALOGFLOW_CX_LOCATION,
      context.DIALOGFLOW_CX_AGENT_ID,
      syncMapKey
    ),
    queryInput: {
      text: {
        text: query,
      },
      languageCode,
    },
    queryParams: {
      parameters: paramsJSON,
      analyzeQueryTextSentiment: true,
    },
  };


  try {
    console.log("before response");
    let [response] = await client.detectIntent(request);
    console.log("after response");

    //We need to pass the SessionId back to the Twilio Studio Flow so that we maintain the conversational state between user and bot while the session is still active
    // response.queryResult.session_id = event.dialogflow_session_id;

    const twiml = new Twilio.twiml.MessagingResponse();

    let responseMessages = [];
    for (
      let index = 0;
      index < response.queryResult.responseMessages.length;
      index++
    ) {
      if (response.queryResult.responseMessages[index].text) {
        twiml.message(response.queryResult.responseMessages[index].text.text[0]);
        // responseMessages.push(
        //   response.queryResult.responseMessages[index].text.text[0]          
        // );
      }
    }
    // twiml.message(responseMessages.join('\n\n'));


    //Send the queryResult data back to Twilio Studio to continue the user<->bot interaction
    callback(null, twiml);
  } catch (error) {
    console.error(error);
    callback(error);
  }
};
