//s3fscache.js
var cache_manager = require('cache-manager');
// var moment = require('moment');
var flag = 0;
var path = require('path');
var minify = require('html-minifier').minify;
var fs = require('fs');
var myconsole = require('debug')("prerender");
const tmp = require("tmp");

module.exports = {
    init: function () {
        this.cache = cache_manager.caching({
            store: s3fs_cache
        });
    },
    requestReceived: function (req, res, next) {
        if (req.prerender.renderType != "html") {
            return next();
        }

        if((req.prerender.url.indexOf('forums')< 0 && req.prerender.url.indexOf('docs')< 0 && req.prerender.url.indexOf('help')< 0 && req.prerender.url.indexOf('crawler')< 0 && req.prerender.url.indexOf('www.storehippo.com')< 0) && req.prerender.url.indexOf('.storehippo.com')>-1 && req.prerender.renderType != "pdf")
        {
            console.log("--------this is a bad request-->",req.prerender.url);
            return res.send(404,"This is a store request");
        }
        if (req.method !== 'GET' || req.headers['refresh-bot']) {
            myconsole("u r in refresh bot function")
            return next();
        }
        else {
            var start = new Date();
            this.cache.get(req, res, function (err, result) {
                var timetaken = new Date() - start;
                myconsole("time taken in get funtion--->>", timetaken);
                if (!err && result) {
                    myconsole('cache hit' + result.length);
                    return res.send(200, result);
                }
                else {
                    myconsole('caching in progress in else');
                    next();
                }
            });
        }

    },
    pageLoaded: function (req, res, next) {
        if (req.prerender.renderType == "pdf" && req.body) {
            req.prerender.statusCode = 200;
            return next();
        }
        myconsole(req.prerender.renderType, 'after page loaded--->', req.prerender.statusCode);
        if (req.prerender.renderType != "html") {
            return next();
        }
        if (req.prerender.statusCode >= 500 || req.prerender.statusCode == 400) {
            myconsole("u r in  if condition of afterPhantomRequest");
            return next();
        }
        else {
            var start = new Date();
            myconsole("----if res is ---")
            this.cache.set(req, req.prerender.content, function () {
                var timetaken = new Date() - start;
                myconsole("time taken in set function-->>>", timetaken);
                // next();
            });
            myconsole("after phantom 22222")
            next();
        }
    }
};
var s3fs_cache = {
    get: function (request, response, callback) {
        var key = request.prerender.url;
        myconsole("GET KEY ::", key);
        if (key == 'favicon.ico') return response.send(200);
        // var site = request.headers['site'];
        var protocol = key.split("://")[0];
        if (!protocol) return callback(new Error("Invalid prerender url"), null);
        var site = key.split("://")[1].split("/")[0];
        myconsole("--prerender url is -->>>", key)

        var key1 = site + '/' + key.replace(/[^a-zA-Z0-9]+/g, '_');
        var key1 = key1.replace(':', '_');
        myconsole('site and path for file is', site, key1);
        var start1 = new Date();

        var error_exist = null;
        var start = new Date();
        fs.stat(path.join(__dirname, "../../crawler_cache/", key1), function (err, stat) {
            if (err) {
                return callback(err, null)
            }
            else {
                var today = new Date();
                var accessTime = today - stat.mtime;
                //604800000 => timeStamp for 7 days
                //10800000  => timeStamp for 3 hours
                if (accessTime > 604800000) {
                    myconsole("access time has over")
                    return callback(new Error("stale file"), null);
                }
                else {
                    fs.readFile(path.join(__dirname, "../../crawler_cache/", key1), 'utf8', function (err, data) {
                        myconsole('err------error when data  is fetching from cache', err);
                        return callback(err, data);
                    });
                }
            }

        });


    },
    set: function (req, value, callback) {
        //  return callback();
        myconsole("---set----")
        var key = req.prerender.url;
        var dirPath = key.split("://")[1].split("/")[0];
        dirPath = dirPath.replace(":", "_");

        var file_name = key.replace(/[^a-zA-Z0-9]+/g, '_');
        myconsole(dirPath, "<<<dir path in cache------------file name in cache>>>>>>", file_name)
        var err = {
            status: 406,
            data: "size issue of page which you are trying to cache"
        }
        if (Buffer.byteLength(value, 'utf8') < 20000) {
            myconsole("file size is smaller < 20000")
            // require("/home/hippo/prerender-master/lib/plugins/ms-stackerror.js").report(err,req,406);
            // throw err;
            callback();
        }
        else {
            var flag_value = value;
            try {
                value = minify(value, {
                    removeAttributeQuotes: true,
                    collapseWhitespace: true,
                    minifyJS: true,
                    removeComments: true,
                    minifyCSS: true,
                    processConditionalComments: true
                });

            }
            catch (e) {
                value = flag_value;
                console.error("HTML Minify Error", e, "   ", "This error comes in",  req.prerender.url);
            }
            fs.mkdir(path.join(__dirname, "../../crawler_cache/", dirPath), function (err) {
                myconsole(err, "----in mk dir------", path.join(__dirname, "../../crawler_cache/", dirPath, file_name));
                fs.writeFile(path.join(__dirname, "../../crawler_cache/", dirPath, file_name), value, function (err) {
                    myconsole("----err in write file------", err);
                    myconsole('The file has been saved in cache!');
                    callback();
                });
            })
        }
    }
};
