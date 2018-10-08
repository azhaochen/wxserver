'use strict';

var OAuth = require('../oauth.js');
var wxapiobj = undefined;
var req = undefined, res=undefined;
var loginInfo = {openid:''};
var empty = function(x){
	if(typeof x=='undefined' || !x || x=='' || x==0 || x==null || x=='undefined' || x==undefined){
		return 1;
	}else{
		return 0;
	}
}

/*用于修改公众平台设置授权url的验证
	console.log(req.query);
	if(!empty(req.query.nonce) && !empty(req.query.signature)){
	    var r = OAuth.checkSignature(req.query);
	    console.log(r);
	    res.send(r);
	    return;
	}
*/

var getWxApi = function(){
	if(!wxapiobj){
		var wxapiobj = new OAuth('wx689cab74de842b67', '2d6e5db557c32d9bd0eb6696c04d704e');
	}
	return wxapiobj;
}


var precessLogin = function(oriurl){
    /*var urlencode = require('urlencode');*/
    var api = getWxApi();
    var wxauthurl = api.getAuthorizeURL(oriurl,0,'snsapi_userinfo');
    res.redirect(wxauthurl);
}

var getLoginInfo = function(code, callback){
	if(!empty(req.cookies.openid) && !empty(req.cookies.access_token)){
		loginInfo.openid = req.cookies.openid;
		loginInfo.access_token = req.cookies.access_token;
		loginInfo.refresh_token = req.cookies.refresh_token;
		loginInfo.head = req.cookies.head;
		loginInfo.nick = decodeURIComponent(req.cookies.nick);	//express自己会进行urldecode编码和解码。中文会encode两次
		typeof callback=='function' && callback();
		return;
	}
	if(!empty(code)){
		//查询code对应的access_token及用户信息，并保存在cookie里面
		var api = getWxApi();
		api.getAccessToken(code,function(err,result){
			if(!empty(err)){
				typeof callback=='function' && callback();
				return;
			}
			/*result格式	{
				  data: {
				    access_token: '14_E_MXcY_tAmTMQx1XL882561MBxKHUxKvVL9PHdTHsguTlJm0l4LFzBGXIkjifEwLvvbFJBagnTt5QKDgmJYNNP-V31MbyB4OwgN5ufryMIc',
				    expires_in: 7200,
				    refresh_token: '14_KUz8tp0FVl1qHLmVxFzSbAzl8pA2eOq34LTi9CYnUogXPBX7qIxE6LG3u9aYC_yPKUK5mK7dW0LknaPGXc9iHfijy7SRk__4JlzB6AaNYwQ',
				    openid: 'o4pQ8017kzxOdNi4MR68yYw5aj8E',
				    scope: 'snsapi_userinfo',
				    create_at: 1538986438033
				  }
				}
			*/
			api.getUser(result.data.openid, function(err,userinfo){
				if(!empty(err)){
					typeof callback=='function' && callback();
					return;
				}
				/*userinfo格式： {
				  openid: 'o4pQ8017kzxOdNi4MR68yYw5aj8E',
				  nickname: '李河',
				  sex: 1,
				  language: 'zh_CN',
				  city: '',
				  province: '',
				  country: 'Algeria',
				  headimgurl: 'http://thirdwx.qlogo.cn/mmopen/vi_32/Q0j4TwGTfTKBbXmLzvJMjSDdZA6iajFric9717RcJHiax5XbDTawTVmicuyKicMzibmogkAI2u5uDapbYLyI5uQTKxqw/132',
				  privilege: []
				}*/

				loginInfo.openid = result.data.openid;
				loginInfo.access_token = result.data.access_token;
				loginInfo.refresh_token = result.data.refresh_token;
				loginInfo.head = userinfo.headimgurl;
				loginInfo.nick = userinfo.nickname;
				//设置cookie http://www.expressjs.com.cn/4x/api.html#req.cookies
				res.cookie('openid', loginInfo.openid, 				{path:'/',maxAge:result.data.expires_in*1000-300*1000});
				res.cookie('access_token', loginInfo.access_token, 	{path:'/',maxAge:result.data.expires_in*1000-300*1000});
				res.cookie('refresh_token', loginInfo.refresh_token,{path:'/',maxAge:29*86400*1000});
				res.cookie('head', loginInfo.head, 					{path:'/',maxAge:result.data.expires_in*1000-300*1000});
				res.cookie('nick', loginInfo.nick, 					{path:'/',maxAge:result.data.expires_in*1000-300*1000});

				typeof callback=='function' && callback();
			});
		});
	}
}


//登录后，具体业务操作
var StartApp = function(){
	res.send(JSON.stringify(loginInfo));
}


module.exports = function (request, response) {
	req = request;
	res = response;
	console.log('query',req.query);

	//1.获取登录信息，未登录则登录
	if(!empty(req.query.code)){
		getLoginInfo(req.query.code,StartApp);	//weixin登录跳转回来
	}else{
		var isLogin = 0;
		if(!empty(req.cookies.openid) && !empty(req.cookies.access_token)){
			isLogin = 1;
		}
		if(isLogin==0){
			var oriurl = 'http://134.175.16.24/weixin/acts/index.js';
			precessLogin(oriurl);
			return;
		}else{
			getLoginInfo('',StartApp);				//已登录，从cookie里面取登录信息
		}
	}
};