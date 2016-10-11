'use strict';

angular.module('patientPickerApp.services', [])
    .factory('oauth2', function($rootScope, $location, appsSettings, tools) {

        var authorizing = false;

        return {
            authorizing: function(){
                return authorizing;
            },
            authorize: function(s, sandboxId){
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

                var serviceUrl;
                if (s.name !== "OAuth server issuing launch context request") {
                    serviceUrl = s.defaultServiceUrl;
                    if (sandboxId !== undefined && sandboxId !== "") {
                        serviceUrl = s.baseServiceUrl + sandboxId + "/data";
                    }
                } else {
                    serviceUrl = s.serviceUrl;
                }
                FHIR.oauth2.authorize({
                    client: client,
                    server: serviceUrl,
                    from: $location.url()
                }, function (err) {
                    authorizing = false;
                    $rootScope.$emit('error', err);
                });
            },
            login: function(sandboxId){
                
                var that = this;
                appsSettings.getSettings().then(function(settings){
                    tools.validateSandboxIdFromUrl().then(function (resultSandboxId) {
                        that.authorize(settings, resultSandboxId);
                    }, function () {
                        that.authorize(settings);
                    });
                });
            }
        };

    }).factory('fhirApiServices', function (oauth2, appsSettings, $stateParams, $rootScope, $location) {

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
                        "serviceUrl": decodeURIComponent($stateParams.iss)
                    });
                } else {
                    oauth2.login();
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
                if (typeof sort !== 'undefined' ) {
                    searchParams.query['name'] = tokens;
                }

                $.when(fhirClient.api.search(searchParams))
                    .done(function(resourceSearchResult){
                        var resourceResults = [];
                        if (resourceSearchResult.data.entry) {
                            resourceSearchResult.data.entry.forEach(function(entry){
                                entry.resource.fullUrl = entry.fullUrl;
                                resourceResults.push(entry.resource);
                            });
                        }
                        deferred.resolve(resourceResults, resourceSearchResult);
                    }).fail(function(error){
                    var test = error;
                    });
                return deferred;
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
                    // url: appsSettings.getSandboxUrlSettings().baseRestUrl + "/util/registerContext",
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
}).factory('tools', function(appsSettings, $rootScope) {

    return {
        validateSandboxIdFromUrl: function() {
            var deferred = $.Deferred();

            if (appsSettings.getSandboxUrlSettings().sandboxId !== undefined) {
                this.checkForSandboxById(appsSettings.getSandboxUrlSettings().sandboxId).then(function(sandbox){
                    if (sandbox !== undefined && sandbox !== "") {
                        deferred.resolve(appsSettings.getSandboxUrlSettings().sandboxId);
                    } else {
                        deferred.reject();
                    }
                });
            } else {
                deferred.reject();
            }
            return deferred;
        },
        checkForSandboxById: function(sandboxId) {
            var deferred = $.Deferred();
            appsSettings.getSettings().then(function(settings){
                if (settings.reservedEndpoints.indexOf(sandboxId.toLowerCase()) > -1) {
                    deferred.resolve("reserved");
                } else {
                    $.ajax({
                        url: appsSettings.getSandboxUrlSettings().baseRestUrl + "/sandbox?lookUpId=" + sandboxId,
                        type: 'GET'
                    }).done(function(sandbox){
                        if (sandbox !== undefined && sandbox !== "") {
                            deferred.resolve(sandbox);
                        } else {
                            deferred.resolve(undefined);
                        }

                        $rootScope.$digest();

                    }).fail(function(error){
                        deferred.resolve(undefined);
                        $rootScope.$digest();
                    });
                }
            });
            return deferred;
        },
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

}).factory('appsSettings', ['$http', 'envInfo',function($http, envInfo)  {

    var settings;
    var sandboxUrlSettings;

    function getDashboardUrl(isLocal, fullBaseUrl) {

        if (!isLocal) {
            // In test/prod the dashboard url is the part of the URL which does not include the path
            var path = window.location.pathname;
            var trailingPathSlash = path.lastIndexOf("/");
            if (trailingPathSlash > -1 && trailingPathSlash === path.length - 1) {
                path = path.substring(0, path.length - 1);
            }
            return fullBaseUrl.substring(0, fullBaseUrl.length - path.length);
        } else {
            var urlPath = window.location.pathname;
            var trailingSlash = urlPath.lastIndexOf("/");
            if (trailingSlash > -1 && trailingSlash === urlPath.length - 1) {
                urlPath = urlPath.substring(0, urlPath.length - 1);
            }
            var leadingSlash = urlPath.indexOf("/");
            if (leadingSlash === 0) {
                urlPath = urlPath.substring(1, urlPath.length);
            }
            var pathSegments = urlPath.split("/");
            switch (pathSegments.length) {
                case 1:   // For localhost, the dashboard url includes the first path segment
                    return fullBaseUrl;
                    break;
                default:  // For localhost, the dashboard url includes the first path segment,
                          // the second path segment (if exists) is the sandboxId
                    var additionalPath = urlPath.substring(pathSegments[0].length);
                    return fullBaseUrl.substring(0, fullBaseUrl.length - additionalPath.length);
                    break;
            }
        }
    }

    return {
        getSandboxUrlSettings: function () {
            if (sandboxUrlSettings !== undefined) {
                return sandboxUrlSettings;
            } else {
                sandboxUrlSettings = {};
                var sandboxBaseUrlWithoutHash = window.location.href.split("#")[0].substring(0, window.location.href.split("#")[0].length);
                if (sandboxBaseUrlWithoutHash.endsWith("/")) {
                    sandboxBaseUrlWithoutHash = sandboxBaseUrlWithoutHash.substring(0, sandboxBaseUrlWithoutHash.length-1);
                }
                sandboxUrlSettings.sandboxManagerRootUrl = getDashboardUrl(envInfo.env === "null", sandboxBaseUrlWithoutHash);
                sandboxUrlSettings.sandboxId = sandboxBaseUrlWithoutHash.substring(sandboxUrlSettings.sandboxManagerRootUrl.length + 1);
                var trailingSlash = sandboxUrlSettings.sandboxId.lastIndexOf("/");
                if (trailingSlash > -1 && trailingSlash === sandboxUrlSettings.sandboxId.length - 1) {
                    sandboxUrlSettings.sandboxId = sandboxUrlSettings.sandboxId.substring(0, sandboxUrlSettings.sandboxId.length - 1);
                }
                if (sandboxUrlSettings.sandboxId === "") {
                    sandboxUrlSettings.sandboxId = undefined;
                }
                sandboxUrlSettings.baseRestUrl = sandboxUrlSettings.sandboxManagerRootUrl + "/REST";
                
            }
            return sandboxUrlSettings;    
        },
        loadSettings: function(){
            var deferred = $.Deferred();
            $http.get('static/js/config/patient-picker.json').success(function(result){
                settings = result;
                if (envInfo.defaultServiceUrl !== "null") {
                    settings.defaultServiceUrl = envInfo.defaultServiceUrl;
                    settings.baseServiceUrl = envInfo.baseServiceUrl;
                }
                deferred.resolve(settings);
                });
            return deferred;
        },
        getSettings: function(){
            var deferred = $.Deferred();
            if (settings !== undefined) {
                deferred.resolve(settings);
            } else {
                this.loadSettings().then(function(result){
                    deferred.resolve(result);
                });
            }
            return deferred;
        }
    };

}]);
