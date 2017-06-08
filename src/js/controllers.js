'use strict';

angular.module('patientPickerApp.controllers', []).controller('navController',
    function ($rootScope, $scope, branded) {

        $scope.title = {blueBarTitle: branded.mainTitle};
        $scope.copyright = branded.copyright;
        $scope.showCert = branded.showCert;

    }).controller("AfterAuthController", // After auth
    function (fhirApiServices) {
        fhirApiServices.initClient();
    }).controller("PatientSearchController",
    function ($scope, $rootScope, $state, $filter, $stateParams, fhirApiServices, $uibModal) {

        $scope.onSelected = $scope.onSelected || function (p) {
                if ($scope.selected.selectedPatient !== p) {
                    $scope.selected.selectedPatient = p;
                    $scope.selected.patientSelected = true;
                }
            };

        var natural = true;
        var inverse = false;
        $scope.sortMap = new Map();
        $scope.sortMap.set("id", [['_id', natural]]);
        $scope.sortMap.set("gender", [['gender', natural]]);
        $scope.sortMap.set("name", [['family', natural], ['given', natural]]);
        $scope.sortMap.set("age", [['birthdate', inverse]]);
        $scope.sortSelected = "name";
        $scope.sortReverse = false;
        $scope.shouldBeOpen = true;

        $scope.patients = [];
        $scope.genderglyph = {"female": "&#9792;", "male": "&#9794;"};
        $scope.searchterm = "";
        var lastQueryResult;

        $scope.count = {start: 0, end: 0, total: 0};

        $rootScope.$on('set-loading', function () {
            $scope.showing.searchloading = true;
        });

        $scope.loadMore = function (direction) {
            $scope.showing.searchloading = true;
            var modalProgress = openModalProgressDialog("Searching...");

            fhirApiServices.getNextOrPrevPage(direction, lastQueryResult).then(function (p, queryResult) {
                lastQueryResult = queryResult;
                $scope.patients = p;
                $scope.showing.searchloading = false;
                $scope.count = fhirApiServices.calculateResultSet(queryResult);
                $rootScope.$digest();

                modalProgress.dismiss();
            });
        };

        $scope.select = function (i) {
            $scope.onSelected($scope.patients[i]);
        };

        $scope.hasPrev = function () {
            return fhirApiServices.hasPrev(lastQueryResult);
        };

        $scope.hasNext = function () {
            return fhirApiServices.hasNext(lastQueryResult);
        };

        $scope.$watchGroup(["searchterm", "sortSelected", "sortReverse"], function () {
            var tokens = [];
            ($scope.searchterm || "").split(/\s/).forEach(function (t) {
                tokens.push(t.toLowerCase());
            });
            $scope.tokens = tokens;
            if ($scope.getMore !== undefined) {
                $scope.getMore();
            }
        });

        var loadCount = 0;
        var search = _.debounce(function (thisLoad) {
            var sortDefs = $scope.sortMap.get($scope.sortSelected);
            var sortValues = [];
            for (var i=0;i<sortDefs.length;i++) {
                sortValues[i] = [];
                sortValues[i][0] = sortDefs[i][0];
                if (sortDefs[i][1]) {
                    // natural
                    sortValues[i][1] = ($scope.sortReverse ? "desc" : "asc");
                } else {
                    // inverted
                    sortValues[i][1] = ($scope.sortReverse ? "asc" : "desc");
                }
            }

            var modalProgress = openModalProgressDialog("Searching...");
            fhirApiServices.queryResourceInstances("Patient", $scope.patientQuery, $scope.tokens, sortValues, 10)
                .then(function (p, queryResult) {
                    if (queryResult.data.entry && queryResult.data.entry.length === 1 && $scope.onePatient) {
                        $scope.onSelected(queryResult.data.entry[0].resource);
                    } else {
                        lastQueryResult = queryResult;
                        if (thisLoad < loadCount) {   // not sure why this is needed (pp)
                            return;
                        }
                        $scope.patients = p;
                        $scope.showing.searchloading = false;
                        $scope.count = fhirApiServices.calculateResultSet(queryResult);
                        $rootScope.$digest();
                    }

                    modalProgress.dismiss();
                });
        }, 600);

        $scope.getMore = function () {
            $scope.showing.searchloading = true;
            search(++loadCount);
        };

        $scope.toggleSort = function (field) {
            $scope.sortReverse = ($scope.sortSelected == field ? !$scope.sortReverse : false);
            $scope.sortSelected = field;
        };

        function openModalProgressDialog(title) {
            return $uibModal.open({
                animation: true,
                templateUrl: 'js/templates/progressModal.html',
                controller: 'ProgressModalCtrl',
                size: 'sm',
                resolve: {
                    getTitle: function () {
                        return title;
                    }
                }
            });
        }
    }).controller('ProgressModalCtrl',['$scope', '$uibModalInstance', "getTitle",
    function ($scope, $uibModalInstance, getTitle) {

        $scope.title = getTitle;

    }]).controller("BindContextController",
    function ($scope, fhirApiServices, $stateParams, oauth2, tools) {

        $scope.showing = {
            noPatientContext: true,
            content: false,
            searchloading: true
        };

        $scope.selected = {
            selectedPatient: {},
            patientSelected: false,
            preLaunch: false
        };

        $scope.onePatient = false;
        $scope.patientQuery = undefined;
        $scope.showPatientId = ($stateParams.show_patient_id !== undefined && $stateParams.show_patient_id === "true");

        if (fhirApiServices.clientInitialized()) {
            // all is good
            $scope.showing.content = true;
        } else {
            // need to complete authorization cycle
            fhirApiServices.initClient();
        }

        $scope.clientName = decodeURIComponent(decodeURIComponent($stateParams.clientName))
            .replace(/\+/, " ");

        if ($stateParams.patients !== undefined) {
            $scope.selected.preLaunch = true;
            $scope.patientQuery = {};
            var queryString = decodeURIComponent(decodeURIComponent($stateParams.patients));
            if (queryString !== "none") {
                // For now the query should only be a Patient query.
                // In the future this query maybe more complex ex. Observations with high blood pressure, where
                // we would display the Patient who are references in the Observations
                if (queryString.indexOf("Patient?") === 0) {
                    queryString = queryString.substr("Patient?".length);
                    var queryItems = queryString.split("&");
                    angular.forEach(queryItems, function (item) {
                        var parts = item.split("=");
                        $scope.patientQuery[parts[0]] = parts[1];
                        if (parts[0] === "_id") {
                            var pCount = parts[1].split(",");
                            if (pCount.length === 1){
                                $scope.onePatient = true;
                            }
                        }
                    });
                }
            } else {
                var to = decodeURIComponent(decodeURIComponent($stateParams.endpoint));
                return window.location = to + "?patient_id=none&iss=" + $stateParams.iss + "&launch_uri=" + $stateParams.launch_uri + "&context_params=" + $stateParams.context_params;
            }
        }

        $scope.onSelected = $scope.onSelected || function (p) {
                var pid = p.id;
                var client_id = tools.decodeURLParam($stateParams.endpoint, "client_id");

                // Pre Launch is for the mock launch flow
                if ($scope.selected.preLaunch) {
                    var to = decodeURIComponent(decodeURIComponent($stateParams.endpoint));
                    return window.location = to + "?patient_id=" + pid + "&iss=" + $stateParams.iss + "&launch_uri=" + $stateParams.launch_uri + "&context_params=" + $stateParams.context_params;
                } else {

                    fhirApiServices
                        .registerContext({client_id: client_id}, {patient: pid})
                        .then(function (c) {
                            var to = decodeURIComponent(decodeURIComponent($stateParams.endpoint));
                            to = to.replace(/scope=/, "launch=" + c.launch_id + "&scope=");
                            return window.location = to;
                        });
                }
            };
    });

