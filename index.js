
// Libs
let request = require('request');
let MongoClient = require('mongodb').MongoClient
let ProgressBar = require('progress')
const fs = require('fs')

// Config vbles
let config = require('./config/config')


// Global vbles
let mongoCdrList = [],
	apiCdrList = [],
	missCdrList = [];



/*
	Main controller

	1. Retrieve cdrs from Api
	2. Retrieve cdrs from Database
	3. Compare both sources and save miss cdrs in source 1
	4. Generate csv with cdrs miss

*/
console.log('\n')
console.log("  			--------------")
console.log("  			POD GROUP EXAM")
console.log("  			--------------")
console.log('\n')


getCdrFromApi()
.then(()=>{
	console.log("  All cdrs from source Api saved in csv file");
	
	getCdrFromDatabase()
	.then(() => {
		console.log("  All cdrs retrieved from Database")

		saveCdrList();
		
		compareCdrLists()
		.then(() => {
			console.log("Saving miss cdr to file ...")

			savemissCdrList();
			//TO-DO: Generate csv with all miss cdrs
			console.log("all finished")				
		}) 		
	})
});


/*
	Source 2

	1. Retrieve cdrs from Api
	2. Save them on disk

*/

async function getCdrFromApi() {

	// Source 2
	console.log('\n')
	console.log("  1. Retrieve cdrs made in May 2018 1rst from Source 2")
	console.log("  ----------------------------------------------------")
	console.log('\n')

	//Create file and stream for csv
	let fileStream = fs.createWriteStream('./csv/csvfromApi2.csv'); 

	
	console.log("  Connecting to Source 2")
	console.log("  Downloading data ...")

	//Connect api and ask for csv file
	await new Promise(resolve =>
    	request(config.apiUrlCsv)
    		.on('error', (err) => {
    			console.log("  Error conecting api")
  			})
      		.pipe(fileStream)			// write csv to disk
      		.on('finish', resolve));
}

/*
	Source 1

	1. Connect to database
	2. Retrieve number of documents matching the date
	3. Retrieve documents

*/

async function getCdrFromDatabase() {

	await new Promise(resolve => {
		// Source 1
		console.log('\n')
		console.log("  2. Retrieve cdrs made in May 2018 1rst from Source 1")
		console.log("  ----------------------------------------------------")
		console.log('\n')

		MongoClient.connect(config.mongoUrl, (err, client) => { 
			if(err) throw err;

			console.log("  Connected to mongo database")


			let queryIn = {
				"call.startTime":  new RegExp('^2018-05-01'), 
				"call.endTime":    new RegExp('^2018-05-01')  
			},
			queryOut = {
				"iccid": 1,
				"call.startTime": 1, 
				"call.endTime": 1
			};

		  	console.log("  Count documents ...")
		  	client.collection("cdr").find(queryIn).count((err, total) => {
		  		if(err) throw err;
		  		console.log("  Total documents found: " + total + '.\n  Download all results ...');
		  		console.log("  ")


		  		let bar = new ProgressBar(' __downloading [:bar] :rate/bps :percent :etas', { 
		  			complete: '=',
		    		incomplete: ' ',
		    		width: 20,
		  			total: total });

		  		let stream = client.collection("cdr").find(queryIn, queryOut).stream()

		  		stream.on("data", (item) => { 
		  				bar.tick();
		  				mongoCdrList.push(item)
		  				});

				stream.on("end", resolve); 
		  	});
		});
	});
}

/*
	Compare sources

	1. Load and parse csv data from Api
	2. Compare iccid, call startTime and call endTime 
	3. Save missed cdrs in source 1

*/

async function compareCdrLists() {

	console.log('\n')
	console.log("  3. Collate both sources")
	console.log("  -----------------------")
	console.log('\n')


	readCdrList();
	const csvFilePath='./csv/csvfromApi2.csv'
	const csv=require('csvtojson')

	console.log("  Extracting data from csv file ...")
	await csv({trim:true}).fromFile(csvFilePath)
				.then((jsonObject) => {
		
		let misscdrcount = 0;
		jsonObject.map((cdr, index ) => {

			let idparams = {
				iccid: parseInt(cdr.iccid.substring(1)),
				st: cdr['startTime(UTC)'],
				et: cdr['endTime(UTC)']
			}

			let bar2 = new ProgressBar(' __collating [:bar] :percent :token1', { 
		  			complete: '=',
		    		incomplete: ' ',
		    		width: 20,
		  			total: mongoCdrList.length });

			let found = false;
			//console.log("comparing cdr: "+ index)
			let coincidences = mongoCdrList.map((item) => {
				if(parseInt(item.iccid) == idparams.iccid && item.call.startTime == idparams.st && item.call.endTime == idparams.et) {
					//console.log("Map resulted for "+ index)
					found = true
					return true;
				}
			})
			if(!found){
				misscdrcount++;
				//console.log("Miss cdr identified " + misscdrcount + "in cdr "+ index)
				missCdrList.push(cdr)
				
			}
			bar2.tick({ 'token1': "Miss cdr identified: " + JSON.stringify(misscdrcount)})
			
				

		})
	});
	
}

/*

	Tools

*/


function saveCdrList() {
	fs.writeFile("./csv/mongocdr.json", JSON.stringify(mongoCdrList), 'utf8', function (err) {
    		if (err) {
        		return console.log(err);
    		}
    		console.log("The file was saved!");
		}); 
}

function savemissCdrList() {
		fs.writeFile("./csv/misscdr.json", JSON.stringify(missCdrLists), 'utf8', function (err) {
    		if (err) {
        		return console.log(err);
    		}

    		console.log("The file was saved!");
		});

}

function readCdrList() {
	
	fs.readFile('./csv/mongocdr.json', 'utf8', function (err, data) {
  		if (err) throw err;
  			mongoCdrList = JSON.parse(data);
		});
}


