
var fetch = require('node-fetch');
var MongoClient = require('mongodb').MongoClient
var ProgressBar = require('progress')

var config = require('./config/config')
const fs = require('fs')

var mongoCdrList = [],
	apiCdrList = [];

// Source 1
console.log('\n')
console.log("  1. Retrieve cdrs made in May 2018 1rst from Source 1")
console.log("  ----------------------------------------------------")
console.log('\n')

MongoClient.connect(config.mongoUrl, (err, client) => { 
	if(err) throw err;

	console.log("  Connected to mongo database")
	var query = { 
				  "call.startTime":  new RegExp('^2018-05-01'), 
				  "call.endTime":    new RegExp('^2018-05-01')  
				};

  	console.log("  Count documents ...")
  	client.collection("cdr").find(query).count((err, total) => {
  		if(err) throw err;
  		console.log("  Total documents found: " + total + '.\n  Download all results ...');
  		console.log("  ")

  		var bar = new ProgressBar(' __downloading [:bar] :rate/bps :percent :etas', { 
  			complete: '=',
    		incomplete: ' ',
    		width: 20,
  			total: total });

  		var itemCount = 0, 
  			stream = client.collection("cdr").find(query).stream();

  		stream.on("data", (item) => { 
  				bar.tick();
  				mongoCdrList.push(item);
  				itemCount++ });

		stream.on("end", () => {
				console.log("  Documents downloaded: "+ itemCount); 
				client.close()}); 
  	});
});



// Source 2
console.log('\n')
console.log("  1. Retrieve cdrs made in May 2018 1rst from Source 2")
console.log("  ----------------------------------------------------")
console.log('\n')

fetch( config.apiUrlJson)
.then(res => { 
	console.log(res)
})
.then(() => console.log("finish"))
    	     

            
/*var compare = apiResults.filter((item) => {
    				if( !mongoResults.has(item)){
    					return item;
    				}
				})

const dest = fs.createWriteStream('./csv/cdrs.csv');
        			res.body.pipe(dest);

				*/