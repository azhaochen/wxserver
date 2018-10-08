/**
   * 详细配置参数参考：http://pm2.keymetrics.io/docs/usage/application-declaration/

   *  pm2 start igame_svr_pm2.config.js --env test
   *  注意，修改本配置文件时，不能用reload或者restart或者stop、start更新。要先stop，然后delete，然后在start才更新。
*/

module.exports = {
  apps : [
    {
      cwd       : "/data/nodeproj/wxserver",                   //home目录
      name      : 'wxserver',                                //app起名字
      script    : 'wx_server.js',
      //instances  : 3,                                             //0 means that PM2 will launch the maximum processes possible according to the numbers of CPUs (cluster mode)
      //exec_mode  : "cluster",
      log_date_format : "YYYY-DD-MM HH:mm:ss",                    //where 'DD-MM HH:mm:ss.SSS' is any momentjs valid format.
      max_memory_restart : "300M",                                //app内存超过后30s内重启。
      merge_logs : true,                                          //合并多进程日志。和下面配置一起用
      error_file : '/root/.pm2/logs/wxserver_error.log',  //若指定。则合并多进程的日志 错误文件路径
      out_file   : '/root/.pm2/logs/wxserver.log',        //若指定。则合并多进程的日志 日志文件路径，跟上面路径一样也可以，就是把所有都合并到一个文件里。

      env: {                      //通用的环境变量可以在这里定义，无论test还是production都会有，node里用process.env.PORT_START可以访问，值为字符串。
        //COMMON_VARIABLE: 'true',
      },
      env_production : {
        PORT_START: 1339,
        NODE_ENV: 'production'
      },
      env_test : {
        PORT_START: 8080,
        NODE_ENV: 'test'
      },
    }
  ]

  /**
   * Deployment section
   * http://pm2.keymetrics.io/docs/usage/deployment/
   
  deploy : {
    production : {
      user : 'node',
      host : '212.83.163.1',
      ref  : 'origin/master',
      repo : 'git@github.com:repo.git',
      path : '/var/www/production',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env production'
    },
    dev : {
      user : 'node',
      host : '212.83.163.1',
      ref  : 'origin/master',
      repo : 'git@github.com:repo.git',
      path : '/var/www/development',
      'post-deploy' : 'npm install && pm2 reload ecosystem.config.js --env dev',
      env  : {
        NODE_ENV: 'dev'
      }
    }
  }
  */
};