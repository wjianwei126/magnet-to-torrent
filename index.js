'use strict';

var mguri = require('magnet-uri');
var request = require('request');
var q = require('q');

var servUrl = [
    function(hash) {
        return 'http://bt.box.n0808.com/' + hash.slice(0, 2) + '/' + hash.slice(-2) + '/' + hash + '.torrent';
    },
    function(hash) {
        return 'https://torrage.com/torrent/' + hash + '.torrent';
    },
    function(hash) {
        return 'http://torcache.net/torrent/' + hash + '.torrent';
    }
    //http://btcache.me/torrent/013060CD7E3C6CD61A2CC983F1714C9359928EFE
];

function parseInfoHash(uri) {
    var uriObj = mguri.decode(uri);
    var hash = uriObj.infoHash || uri;
    if (/^[A-Za-z0-9]{40}$/.test(hash)) {
        return hash.toUpperCase();
    }
}

function getTorrent(url, cb) {
    //console.log('Get torrent from:', url);
    var options = {
        url: url,
        headers: {
            'User-Agent': 'Node.js/12.0 io.js/2.0',
            'Accept-Encoding': 'gzip,deflate'
        }
    };
    request.get(options)
        .on('error', function(err) {
            cb(err);
        })
        .on('response', function(response) {
            if (response.statusCode === 200) {
                if (response.headers['content-type'] === 'application/octet-stream' ||
                    response.headers['content-type'] === 'application/x-bittorrent') {
                    cb(null, url);
                } else {
                    cb('Invalid content type: ' + response.headers['content-type']);
                }
            } else {
                cb('Error response: ' + response.statusCode);
            }
        });
}

module.exports = function(uri, cb) {
    var hash = parseInfoHash(uri), d = q.defer();
    if (!hash) {
        d.reject('Invalid magnet uri or info hash.');
    }

    var getNext = function(x) {
        if (x < servUrl.length) {
            getTorrent(servUrl[x](hash), function(err, url) {
                if (err) {
                    //console.log(err);
                    getNext(x+1);
                } else {
                    d.resolve(url);
                }
            });
        } else {
            d.reject('Could not convert magnet link. All services tried.');
        }
    };

    getNext(0);
    return d.promise;
};