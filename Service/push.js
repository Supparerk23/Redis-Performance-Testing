require('dotenv').config()
const fs = require('fs');
const redis = require("redis");
console.clear();
const prefix_date = process.env.PREFIX;
const client = redis.createClient(process.env.REDISPORT, process.env.REDISIP);

let rawdata = fs.readFileSync('res.json');
let DataConfig = JSON.parse(rawdata);
let pretest_insert = 0;
client.on("error", function(error) {
  console.error(error);
  process.exit(0)
});

client.on("connect", function(error) {
  console.log('Connecting');
});

client.on("ready", function(error) {
  console.log('Connected');
  Push();
});

function Push(){
	//DataConfig.size.all
	for (i = 0; i < DataConfig.size.all; i++) {

		if(i<DataConfig.size.pretest){
			SetRedis('pretest',i,DataConfig.size.all);
			pretest_insert = pretest_insert+1;
		}else{
			SetRedis('real',i,DataConfig.size.all);
		}
	}

	console.log('')
	CheckPreTest();
}

function SetRedis(key,i,all){
	const timestamp = new Date().getTime();
	client.set(key+':'+prefix_date+'_'+timestamp+'_'+i, 'Test');
    // Expire in 1 day
    client.expire(key, 86400);


    process.stdout.write("Push : ["+i+"/"+all+"] be pretest : ["+pretest_insert+"] \033[0G");
}

function CheckPreTest(){

	client.keys("pretest_*", function(err, keys) {

	  var count = keys.length;
	  console.log('pretest size : '+count+'/'+DataConfig.size.pretest);
	  process.exit(0);

	});

}