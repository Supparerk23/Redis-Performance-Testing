require('dotenv').config()
const fs = require('fs');
const redis = require("redis");
console.clear()
const client = redis.createClient(process.env.REDISPORT, process.env.REDISIP);

let pretest_count = {a:0,b:0,c:0};
let real_count = {a:0,b:0,c:0};
let redisState = { human:{ max:'0',used:'0' , total_systems:'0' , keys:'0'} , non_human:{ max:'0',used:'0' , total_systems:'0' } , start_status : { used:'0'} };
let dataAlready = false;

let DataConfig = { size:{ all:0,pretest:0,group_size:parseInt(process.env.GROUPSIZE) } };
let ReportData = [];
client.on("error", function(error) {
  console.error(error);
  process.exit(0)
});

client.on("connect", function(error) {
  console.log('Connecting');
});

client.on("ready", function(error) {
  console.log('Connected');
  Service();
});

function Service(){

	setInterval(() => {

		CheckByPrefix('a');
		CheckByPrefix('b');
		CheckByPrefix('c');

		client.info((err, info) => {
	        if (err) throw err;


	    	redisState.human.max = info.split("\n").find(line => line.match(/maxmemory_human/)).split(":")[1].replace('\r','');
	    	redisState.human.used = info.split("\n").find(line => line.match(/used_memory_human/)).split(":")[1].replace('\r','');
	    	redisState.human.total_systems = info.split("\n").find(line => line.match(/total_system_memory_human/)).split(":")[1].replace('\r','');
	    	if(info.split("\n").find(line => line.match(/db0:keys/))){
	    		let db0 = info.split("\n").find(line => line.match(/db0:keys/)).split(":")[1].replace('\r','');
	    		
	    		raw_key = db0.split(",")[0].split("=")[1];

	    		if((dataAlready)&&(redisState.human.keys<raw_key)){

	    			PushReport(1)
	    		}

	    		redisState.human.keys = raw_key;
	    	}
	    

	    	redisState.non_human.max = info.split("\n").find(line => line.match(/maxmemory/)).split(":")[1].replace('\r','');
	    	redisState.non_human.used = info.split("\n").find(line => line.match(/used_memory/)).split(":")[1].replace('\r','');
	    	redisState.non_human.total_systems = info.split("\n").find(line => line.match(/total_system_memory/)).split(":")[1].replace('\r','');

	    	if(redisState.start_status.used=='0'){
	    		redisState.start_status.used = info.split("\n").find(line => line.match(/used_memory/)).split(":")[1].replace('\r','');
	    		evaluateDataSize();
	    	}

	    	if(!dataAlready){

				if(parseInt(redisState.non_human.used)>parseInt(redisState.start_status.used)){
					calculateDataSize()
				}

	    	}else{
	    		process.stdout.write("Used : ["+redisState.human.used+"] Mex : ["+redisState.human.max+"] Systems Mem : ["+redisState.human.total_systems+"] All Keys ["+redisState.human.keys+"] "+new Date()+" \033[0G");
	    	}

	    	PushReport(0)

	    });

	}, 500);

}

function PushReport(policy_run){
	let obj = {
		time:new Date(),
		used:parseInt(redisState.non_human.used),
		keys:parseInt(redisState.human.keys),
		pretest_a:pretest_count.a,
		non_pretest_a:real_count.a,
		pretest_b:pretest_count.b,
		non_pretest_b:real_count.b,
		pretest_c:pretest_count.c,
		non_pretest_c:real_count.c,
		policy:policy_run
	};
	ReportData.push(obj);
	fs.writeFileSync('report.json', JSON.stringify(ReportData));
}

function CheckByPrefix(prefix){
	CheckPreTest(prefix)
	CheckRealDate(prefix)
}

function CheckPreTest(prefix){

	client.keys("pretest:"+prefix+"_*", function(err, keys) {

	  pretest_count[prefix] = keys.length;

	});

}

function CheckRealDate(prefix){

	client.keys("real:"+prefix+"_*", function(err, keys) {

	  real_count[prefix] = keys.length;

	});

}

function Push(){
	StartPushAutomatic = false;

	for (i = 1; i < DataConfig.size.all; i++) {

		if(i<DataConfig.size.pretest){
			SetRedis('pretest');
		}else{
			SetRedis('real');
		}
	  
	}
}

function evaluateDataSize(){
	SetRedis('pretest');
}

function calculateDataSize(){
	const now_used = parseInt(redisState.non_human.used)
	const start_used = parseInt(redisState.start_status.used)

	const dataPerKey = now_used-start_used;
	console.log('Data Size Per KEY :'+dataPerKey)
	DataConfig.size.all = Math.ceil(process.env.REDISSIZE/dataPerKey)
	DataConfig.size.pretest = Math.ceil(DataConfig.size.all/DataConfig.size.group_size);

	console.log('Ready to PUSH');
	console.log('');
	dataAlready = true;

	let data = JSON.stringify(DataConfig);
	fs.writeFileSync('res.json', data);
}

function SetRedis(key,exp=86400){
	const timestamp = new Date().getTime();
	client.set(key+'_'+timestamp, 'Test');
    // Expire in 1 day
    client.expire(key, 86400);
}

 
// client.set("key", "value", redis.print);
// client.get("key", redis.print);