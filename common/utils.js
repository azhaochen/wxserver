var fs = undefined;
var os = undefined;



//判断变量x是否为空，空字符串，0，空数组
module.exports.empty = function(x){
    if(!x || x==null || typeof x=='undefined' || x=='' || x==0){
        return 1;
    }
    if(typeof x.length!='undefined' && x.length==0){
        return 1;
    }
    return 0;
}


/*
    path：目录，可以为相对目录
*/
module.exports.get_all_file = function(path){
	if(!fs){
		fs = require('fs');
	}
    var files = fs.readdirSync(path);           //文件夹和文件
    var result = {
        foldername:[],  //文件夹名字
        filename:[]     //文件名，有后缀
    };
    files.forEach(function(file){
        var pathname = path+'/'+file, stat=fs.lstatSync(pathname);
        if(!stat.isDirectory()){
            result.filename.push(file);
        }else{
            result.foldername.push(file);
        }
    });
    return result;
}

//获取本机ip
module.exports.get_location_ip = function(){
	if(!os){
		os = require('os');
	}
	var ip = '';
	var network = os.networkInterfaces();
	for(var eth in network){
	    if (eth == 'eth0'){ //外网
	        if (network[eth][0].family == 'IPv4'){
	            ip = network[eth][0].address;
	            break;
	        }
	    }
	    else if(eth == 'eth1'){ //内网
	        if (network[eth][0].family == 'IPv4'){
	            ip = network[eth][0].address;
	            break;
	        }
	    }
	}

    return ip;
};







