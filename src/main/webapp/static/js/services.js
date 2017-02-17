'use strict';

angular.module('patientPickerApp.services', [])
    .factory('oauth2', function($rootScope, $location) {

        var authorizing = false;

        return {
            authorizing: function(){
                return authorizing;
            },
            authorize: function(aud){
                // window.location.origin does not exist in some non-webkit browsers
                if (!window.location.origin) {
                    window.location.origin = window.location.protocol + "//"
                        + window.location.hostname
                        + (window.location.port ? ':' + window.location.port: '');
                }

                var thisUri = window.location.origin + window.location.pathname;
                var thisUrl = thisUri.replace(/\/+$/, "/");

                var client = {
                    "client_id": "patient_picker",
                    "redirect_uri": thisUrl,
                    "scope":  "smart/orchestrate_launch user/*.* profile openid"
                };
                authorizing = true;

                FHIR.oauth2.authorize({
                    client: client,
                    server: aud.serviceUrl,
                    from: $location.url()
                }, function (err) {
                    authorizing = false;
                    $rootScope.$emit('error', err);
                });
            }
        };

    }).factory('fhirApiServices', function (oauth2, $stateParams, $rootScope, $location) {

        /**
         *
         *      FHIR SERVICE API CALLS
         *
         **/

        var fhirClient;

        function getQueryParams(url) {
            var index = url.lastIndexOf('?');
            if (index > -1){
                url = url.substring(index+1);
            }
            var urlParams;
            var match,
                pl     = /\+/g,  // Regex for replacing addition symbol with a space
                search = /([^&=]+)=?([^&]*)/g,
                decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
                query  = url;

            urlParams = {};
            while (match = search.exec(query))
                urlParams[decode(match[1])] = decode(match[2]);
            return urlParams;
        }

        return {
            clearClient: function(){
                fhirClient = null;
                sessionStorage.clear();
            },
            fhirClient: function(){
                return fhirClient;
            },
            clientInitialized: function(){
                return (fhirClient !== undefined && fhirClient !== null);
            },
            initClient: function(){
                var params = getQueryParams($location.url());
                if (params.code){
                    delete sessionStorage.tokenResponse;
                    FHIR.oauth2.ready(params, function(newSmart){
                        sessionStorage.setItem("hspcAuthorized", true);
                        fhirClient = newSmart;
                        if (newSmart && newSmart.state && newSmart.state.from !== undefined){
                            $location.url(newSmart.state.from);
                        }
                        $rootScope.$emit('signed-in');
                        $rootScope.$digest();
                    });
                } else if ($stateParams.iss){
                    oauth2.authorize({
                        "name": "OAuth server issuing launch context request",
                        "serviceUrl": decodeURIComponent(decodeURIComponent($stateParams.iss))
                    });
                }
            },
            hasNext: function(lastSearch) {
                var hasLink = false;
                if (lastSearch  === undefined) {
                    return false;
                } else {
                    lastSearch.data.link.forEach(function(link) {
                        if (link.relation == "next") {
                            hasLink = true;
                        }
                    });
                }
                return hasLink;
            },
            hasPrev: function(lastSearch) {
                var hasLink = false;
                if (lastSearch  === undefined) {
                    return false;
                } else {
                    lastSearch.data.link.forEach(function(link) {
                        if (link.relation == "previous") {
                            hasLink = true;
                        }
                    });
                }
                return hasLink;
            },
            getNextOrPrevPage: function(direction, lastSearch) {
                var deferred = $.Deferred();
                $.when(fhirClient.api[direction]({bundle: lastSearch.data}))
                    .done(function(pageResult){
                        var resources = [];
                        if (pageResult.data.entry) {
                            pageResult.data.entry.forEach(function(entry){
                                resources.push(entry.resource);
                            });
                        }
                        deferred.resolve(resources, pageResult);
                    });
                return deferred;
            },
            queryResourceInstances: function(resource, searchValue, tokens, sort, count) {
                var deferred = $.Deferred();

                if (count === undefined) {
                    count = 50;
                }

                var searchParams = {type: resource, count: count};
                searchParams.query = {};
                if (searchValue !== undefined) {
                    searchParams.query = searchValue;
                }
                if (typeof sort !== 'undefined' ) {
                    searchParams.query['$sort'] = sort;
                }
                if (typeof tokens !== 'undefined' ) {
                    searchParams.query['name'] = tokens;
                }

                $.when(fhirClient.api.search(searchParams))
                    .done(function(resourceSearchResult){
                        var resourceResults = [];
                        if (resourceSearchResult.data.entry) {
                            resourceSearchResult.data.entry.forEach(function(entry){
                                resourceResults.push(entry.resource);
                            });
                        }
                        deferred.resolve(resourceResults, resourceSearchResult);
                    }).fail(function(error){
                    var test = error;
                    });
                return deferred;
            },
            //NOTE: This is FHIR implementation specific.
            // Next, Prev and Self link impls are not defined in the FHIR spec
            calculateResultSet: function(lastSearch) {
                var count = {start: 0, end: 0, total: 0};
                count.total = lastSearch.data.total;
                var pageSize;
                var hasNext = this.hasNext(lastSearch);

                if (this.hasNext(lastSearch)) {
                    lastSearch.data.link.forEach(function (link) {
                        if (link.relation == "next") {
                            var querySting = decodeURIComponent(link.url).split("?");
                            var paramPairs = querySting[1].split("&");
                            for (var i = 0; i < paramPairs.length; i++) {
                                var parts = paramPairs[i].split('=');
                                if (parts[0] === "_count") {
                                    pageSize = Number(parts[1]);
                                }
                            }
                        }
                    });
                    lastSearch.data.link.forEach(function(link) {
                        if (link.relation == "next") {
                            var querySting = decodeURIComponent(link.url).split("?");
                            var paramPairs = querySting[1].split("&");
                            for (var i = 0; i < paramPairs.length; i++) {
                                var parts = paramPairs[i].split('=');
                                if (parts[0] === "_getpagesoffset") {
                                    if (Number(parts[1]) === pageSize) {
                                        count.start = 1;
                                    } else {
                                        count.start = Number(parts[1]) - pageSize + 1;
                                    }
                                    if ((Number(parts[1]) + pageSize) != count.total) {
                                        count.end = Number(parts[1]);
                                    } else {
                                        count.end = count.total;
                                    }
                                }
                            }
                        }
                    });
                } else {
                    lastSearch.data.link.forEach(function (link) {
                        if (link.relation == "self") {
                            var querySting = decodeURIComponent(link.url).split("?");
                            var paramPairs = querySting[1].split("&");
                            for (var i = 0; i < paramPairs.length; i++) {
                                var parts = paramPairs[i].split('=');
                                if (parts[0] === "_count") {
                                    pageSize = Number(parts[1]);
                                }
                            }
                        }
                    });
                    lastSearch.data.link.forEach(function(link) {
                        if (link.relation == "self") {
                            var querySting = decodeURIComponent(link.url).split("?");
                            var paramPairs = querySting[1].split("&");
                            for (var i = 0; i < paramPairs.length; i++) {
                                var parts = paramPairs[i].split('=');
                                if (parts[0] === "_getpagesoffset") {
                                    if (Number(parts[1]) === 0) {
                                        count.start = 1;
                                    } else {
                                        count.start = Number(parts[1]) + 1;
                                    }
                                    if ((Number(parts[1]) + pageSize) < count.total) {
                                        count.end = Number(parts[1]) + pageSize;
                                    } else {
                                        count.end = count.total;
                                    }
                                }
                            }
                        }
                    });
                }

                return count;
            },
            readResourceInstance: function(resource, id) {
                var deferred = $.Deferred();

                $.when(fhirClient.api.read({type: resource, id: id}))
                    .done(function(resourceResult){
                        var resource;
                        resource = resourceResult.data.entry;
                        resource = resourceResult.data.entry.fullUrl;
                        deferred.resolve(resource);
                    }).fail(function(error){
                        var test = error;
                    });
                return deferred;
            },
            registerContext: function(app, params) {
                var deferred = $.Deferred();

                var req = fhirClient.authenticated({
                    url: fhirClient.server.serviceUrl + '/_services/smart/Launch',
                    type: 'POST',
                    contentType: "application/json",
                    data: JSON.stringify({
                        client_id: app.client_id,
                        parameters: params
                    })
                });

                $.ajax(req)
                    .done(deferred.resolve)
                    .fail(deferred.reject);

                return deferred;
            }
        }
}).factory('tools', function() {

    return {
        decodeURLParam: function (url, param) {
            var query;
            var data;
            var result = [];

            try {
                query = decodeURIComponent(url).split("?")[1];
                data = query.split("&");
            } catch (err) {
                return null;
            }

            for(var i=0; i<data.length; i++) {
                var item = data[i].split("=");
                if (item[0] === param) {
                    result.push(item[1]);
                }
            }

            if (result.length === 0){
                return null;
            }
            return result[0];
        }
    };

}).factory('branded', ['brandedText',function(brandedText)  {
    return brandedText["branded"];
}]);
