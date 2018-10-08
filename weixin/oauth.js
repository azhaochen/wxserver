'use strict';

var urllib = require('urllib');
var extend = require('util')._extend;
var querystring = require('querystring');
var sha1 = require('sha1');

/**
 * �Է��ؽ����һ���װ���������΢�ŷ��صĴ��󣬽�����һ������
 * �μ���http://mp.weixin.qq.com/wiki/index.php?title=������˵��
 */
var wrapper = function (callback) {
  return function (err, data, res) {
    callback = callback || function () {};
    if (err) {
      err.name = 'WeChatAPI' + err.name;
      return callback(err, data, res);
    }
    if (data.errcode) {
      err = new Error(data.errmsg);
      err.name = 'WeChatAPIError';
      err.code = data.errcode;
      return callback(err, data, res);
    }
    callback(null, data, res);
  };
};


var AccessToken = function (data) {
  if (!(this instanceof AccessToken)) {
    return new AccessToken(data);
  }
  this.data = data;
};

/*!
 * ���AccessToken�Ƿ���Ч��������Ϊ��ǰʱ��͹���ʱ����жԱ�
 *
 * Examples:
 * ```
 * token.isValid();
 * ```
 */
AccessToken.prototype.isValid = function () {
  return !!this.data.access_token && (new Date().getTime()) < (this.data.create_at + this.data.expires_in * 1000);
};

/*!
 * ����token�����¹���ʱ��
 */
var processToken = function (that, callback) {
  var create_at = new Date().getTime();

  return function (err, data, res) {
    if (err) {
      return callback(err, data);
    }
    data.create_at = create_at;
    // �洢token
    that.saveToken(data.openid, data, function (err) {
      callback(err, new AccessToken(data));
    });
  };
};

/**
 * ����appid��appsecret����OAuth�ӿڵĹ��캯��
 * �������̿�������в�����access token��Ҫ����ȫ��ά��
 * ʹ��ʹ��token�����ȼ��ǣ�
 *
 * 1. ʹ�õ�ǰ�����token����
 * 2. ���ÿ�������Ļ�ȡtoken���첽���������token֮��ʹ�ã�������������

 * Examples:
 * ```
 * var OAuth = require('wechat-oauth');
 * var api = new OAuth('appid', 'secret');
 * ```
 * @param {String} appid �ڹ���ƽ̨������õ���appid
 * @param {String} appsecret �ڹ���ƽ̨������õ���app secret
 * @param {Function} getToken ���ڻ�ȡtoken�ķ���
 * @param {Function} saveToken ���ڱ���token�ķ���
 */
var OAuth = function (appid, appsecret, getToken, saveToken, isMiniProgram) {
  this.appid = appid;
  this.appsecret = appsecret;
  this.isMiniProgram = isMiniProgram;
  // token�Ļ�ȡ�ʹ洢
  this.store = {};
  this.getToken = getToken || function (openid, callback) {
    callback(null, this.store[openid]);
  };
  if (!saveToken && process.env.NODE_ENV === 'production') {
    console.warn('Please dont save oauth token into memory under production');
  }
  this.saveToken = saveToken || function (openid, token, callback) {
    this.store[openid] = token;
    callback(null);
  };
  this.defaults = {};
};

/**
 * ��������urllib��Ĭ��options
 *
 * Examples:
 * ```
 * oauth.setOpts({timeout: 15000});
 * ```
 * @param {Object} opts Ĭ��ѡ��
 */
OAuth.prototype.setOpts = function (opts) {
  this.defaults = opts;
};

/*!
 * urllib�ķ�װ
 *
 * @param {String} url ·��
 * @param {Object} opts urllibѡ��
 * @param {Function} callback �ص�����
 */
OAuth.prototype.request = function (url, opts, callback) {
  var options = {};
  extend(options, this.defaults);
  if (typeof opts === 'function') {
    callback = opts;
    opts = {};
  }
  for (var key in opts) {
    if (key !== 'headers') {
      options[key] = opts[key];
    } else {
      if (opts.headers) {
        options.headers = options.headers || {};
        extend(options.headers, opts.headers);
      }
    }
  }
  urllib.request(url, options, callback);
};

/**
 * ��ȡ��Ȩҳ���URL��ַ
 * @param {String} redirect ��Ȩ��Ҫ��ת�ĵ�ַ
 * @param {String} state �����߿��ṩ������
 * @param {String} scope ���÷�Χ��ֵΪsnsapi_userinfo��snsapi_base��ǰ�����ڵ���������������ת
 */
OAuth.prototype.getAuthorizeURL = function (redirect, state, scope) {
  var url = 'https://open.weixin.qq.com/connect/oauth2/authorize';
  var info = {
    appid: this.appid,
    redirect_uri: redirect,
    response_type: 'code',
    scope: scope || 'snsapi_base',
    state: state || ''
  };

  return url + '?' + querystring.stringify(info) + '#wechat_redirect';
};

/**
 * ��ȡ��Ȩҳ���URL��ַ
 * @param {String} redirect ��Ȩ��Ҫ��ת�ĵ�ַ
 * @param {String} state �����߿��ṩ������
 * @param {String} scope ���÷�Χ��ֵΪsnsapi_login��ǰ�����ڵ���������������ת
 */
OAuth.prototype.getAuthorizeURLForWebsite = function (redirect, state, scope) {
  var url = 'https://open.weixin.qq.com/connect/qrconnect';
  var info = {
    appid: this.appid,
    redirect_uri: redirect,
    response_type: 'code',
    scope: scope || 'snsapi_login',
    state: state || ''
  };

  return url + '?' + querystring.stringify(info) + '#wechat_redirect';
};

/**
 * ������Ȩ��ȡ����code����ȡaccess token��openid
 * ��ȡopenid֮�󣬿��Ե���`wechat.API`����ȡ������Ϣ
 * Examples:
 * ```
 * api.getAccessToken(code, callback);
 * ```
 * Callback:
 *
 * - `err`, ��ȡaccess token�����쳣ʱ���쳣����
 * - `result`, �ɹ�ʱ�õ�����Ӧ���
 *
 * Result:
 * ```
 * {
 *  data: {
 *    "access_token": "ACCESS_TOKEN",
 *    "expires_in": 7200,
 *    "refresh_token": "REFRESH_TOKEN",
 *    "openid": "OPENID",
 *    "scope": "SCOPE"
 *  }
 * }
 * ```
 * @param {String} code ��Ȩ��ȡ����code
 * @param {Function} callback �ص�����
 */
OAuth.prototype.getAccessToken = function (code, callback) {
  var url = 'https://api.weixin.qq.com/sns/oauth2/access_token';
  var info = {
    appid: this.appid,
    secret: this.appsecret,
    code: code,
    grant_type: 'authorization_code'
  };
  var args = {
    data: info,
    dataType: 'json'
  };
  this.request(url, args, wrapper(processToken(this, callback)));
};

/**
 * ������Ȩ��ȡ����code����ȡС�����session key��openid���Լ��������µ�unionid��
 * ��ȡopenid֮�󣬿��Ե���`wechat.API`����ȡ������Ϣ
 * Examples:
 * ```
 * api.getSessionKey(code, callback);
 * ```
 * Callback:
 *
 * - `err`, ��ȡsession key�����쳣ʱ���쳣����
 * - `result`, �ɹ�ʱ�õ�����Ӧ���
 *
 * Result:
 * ```
 * {
 *  data: {
 *    "session_key": "SESSION_KEY",
 *    "openid": "OPENID",
 *    "unionid": "UNIONID"
 *  }
 * }
 * ```
 * @param {String} code ��Ȩ��ȡ����code
 * @param {Function} callback �ص�����
 */
OAuth.prototype.getSessionKey = function(code, callback) {
  var url = 'https://api.weixin.qq.com/sns/jscode2session';
  var info = {
    appid: this.appid,
    secret: this.appsecret,
    js_code: code,
    grant_type: 'authorization_code',
  };
  var args = {
    data: info,
    dataType: 'json'
  };
  this.request(url, args, wrapper(processToken(this, callback)));
};

/**
 * ����refresh token��ˢ��access token������getAccessToken�����Ч
 * Examples:
 * ```
 * api.refreshAccessToken(refreshToken, callback);
 * ```
 * Callback:
 *
 * - `err`, ˢ��access token�����쳣ʱ���쳣����
 * - `result`, �ɹ�ʱ�õ�����Ӧ���
 *
 * Result:
 * ```
 * {
 *  data: {
 *    "access_token": "ACCESS_TOKEN",
 *    "expires_in": 7200,
 *    "refresh_token": "REFRESH_TOKEN",
 *    "openid": "OPENID",
 *    "scope": "SCOPE"
 *  }
 * }
 * ```
 * @param {String} refreshToken refreshToken
 * @param {Function} callback �ص�����
 */
OAuth.prototype.refreshAccessToken = function (refreshToken, callback) {
  var url = 'https://api.weixin.qq.com/sns/oauth2/refresh_token';
  var info = {
    appid: this.appid,
    grant_type: 'refresh_token',
    refresh_token: refreshToken
  };
  var args = {
    data: info,
    dataType: 'json'
  };
  this.request(url, args, wrapper(processToken(this, callback)));
};

OAuth.prototype._getUser = function (options, accessToken, callback) {
  var url = 'https://api.weixin.qq.com/sns/userinfo';
  var info = {
    access_token: accessToken,
    openid: options.openid,
    lang: options.lang || 'en'
  };
  var args = {
    data: info,
    dataType: 'json'
  };
  this.request(url, args, wrapper(callback));
};


/**
 * ����openid����ȡ�û���Ϣ��
 * ��access token��Чʱ���Զ�ͨ��refresh token��ȡ�µ�access token��Ȼ���ٻ�ȡ�û���Ϣ
 * Examples:
 * ```
 * api.getUser(openid, callback);
 * api.getUser(options, callback);
 * ```
 *
 * Options:
 * ```
 * // ��
 * {
 *  "openid": "the open Id", // ����
 *  "lang": "the lang code" // zh_CN ���壬zh_TW ���壬en Ӣ��
 * }
 * ```
 * Callback:
 *
 * - `err`, ��ȡ�û���Ϣ�����쳣ʱ���쳣����
 * - `result`, �ɹ�ʱ�õ�����Ӧ���
 *
 * Result:
 * ```
 * {
 *  "openid": "OPENID",
 *  "nickname": "NICKNAME",
 *  "sex": "1",
 *  "province": "PROVINCE"
 *  "city": "CITY",
 *  "country": "COUNTRY",
 *  "headimgurl": "http://wx.qlogo.cn/mmopen/g3MonUZtNHkdmzicIlibx6iaFqAc56vxLSUfpb6n5WKSYVY0ChQKkiaJSgQ1dZuTOgvLLrhJbERQQ4eMsv84eavHiaiceqxibJxCfHe/46",
 *  "privilege": [
 *    "PRIVILEGE1"
 *    "PRIVILEGE2"
 *  ]
 * }
 * ```
 * @param {Object|String} options ����openid���߲μ�Options
 * @param {Function} callback �ص�����
 */
OAuth.prototype.getUser = function (options, callback) {
  if (typeof options !== 'object') {
    options = {
      openid: options
    };
  }
  var that = this;
  this.getToken(options.openid, function (err, data) {
    if (err) {
      return callback(err);
    }
    // û��token����
    if (!data) {
      var error = new Error('No token for ' + options.openid + ', please authorize first.');
      error.name = 'NoOAuthTokenError';
      return callback(error);
    }
    var token = new AccessToken(data);
    if (token.isValid()) {
      that._getUser(options, token.data.access_token, callback);
    } else {
      that.refreshAccessToken(token.data.refresh_token, function (err, token) {
        if (err) {
          return callback(err);
        }
        that._getUser(options, token.data.access_token, callback);
      });
    }
  });
};

/**
 * ������Ȩƾ֤��access_token���Ƿ���Ч��
 * Examples:
 * ```
 * api.verifyToken(openid, accessToken, callback);
 * ```
 * @param {String} openid ����openid
 * @param {String} accessToken ��У���access token
 * @param {Function} callback �ص�����
 */
OAuth.prototype.verifyToken = function (openid, accessToken, callback) {
  var url = 'https://api.weixin.qq.com/sns/auth';
  var info = {
    access_token: accessToken,
    openid: openid
  };
  var args = {
    data: info,
    dataType: 'json'
  };
  this.request(url, args, wrapper(callback));
};

/**
 * ����code����ȡ�û���Ϣ��ע�⣬��OAuthΪMiniProgram����ʱ�����ص��û������������ͬ����鿴�ٷ��ĵ�ȷ�����ݽṹ�Ա������
 * Examples:
 * ```
 * api.getUserByCode(code, callback);
 * ```
 * Callback:
 *
 * - `err`, ��ȡ�û���Ϣ�����쳣ʱ���쳣����
 * - `result`, �ɹ�ʱ�õ�����Ӧ���
 *
 * Result:
 * ```
 * {
 *  "openid": "OPENID",
 *  "nickname": "NICKNAME",
 *  "sex": "1",
 *  "province": "PROVINCE"
 *  "city": "CITY",
 *  "country": "COUNTRY",
 *  "headimgurl": "http://wx.qlogo.cn/mmopen/g3MonUZtNHkdmzicIlibx6iaFqAc56vxLSUfpb6n5WKSYVY0ChQKkiaJSgQ1dZuTOgvLLrhJbERQQ4eMsv84eavHiaiceqxibJxCfHe/46",
 *  "privilege": [
 *    "PRIVILEGE1"
 *    "PRIVILEGE2"
 *  ]
 * }
 * ```
 * @param {Object|String} options ��Ȩ��ȡ����code
 * @param {Function} callback �ص�����
 */
OAuth.prototype.getUserByCode = function (options, callback) {
  var that = this;

  var lang, code;
  if (typeof options === 'string') {
    code = options;
  } else {
    lang = options.lang;
    code = options.code;
  }

  if (this.isMiniProgram) {
    this.getSessionKey(code, function (err, result) {
      if (err) {
        return callback(err);
      }
      var openid = result.data.openid;
      that.decryptMiniProgramUser({
        openid: openid,
        encryptedData: options.encryptedData,
        iv: options.iv,
      }, callback);
    });
  } else {
    this.getAccessToken(code, function (err, result) {
      if (err) {
        return callback(err);
      }
      var openid = result.data.openid;
      that.getUser({openid: openid, lang: lang}, callback);
    });
  }
};

OAuth.empty = function(x){
	if(typeof x=='undefined' || !x || x=='' || x==0 || x==null || x=='undefined' || x==undefined){
		return 1;
	}else{
		return 0;
	}
}

/**
 * ΢�Ź��ںŹ����̨���޸�����urlʱ��Ҫ��֤�õġ�ֻ��һ�Ρ�
 */
OAuth.checkSignature = function(params){
	if(!OAuth.empty(params['signature']) && !OAuth.empty(params['timestamp']) && !OAuth.empty(params['nonce']) && !OAuth.empty(params['echostr'])){
		var tmpArr = [params['nonce'], params['timestamp'], 'srsy'];
		var newsign = tmpArr.sort().join('');
		if(params['signature'] == sha1(newsign)){
			return params['echostr'];
		}
	}
	return 0;
}

module.exports = OAuth;