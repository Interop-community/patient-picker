'use strict';

angular.module('patientPickerApp.controllers', []).controller('navController',
    function($rootScope, $scope) {

        $scope.title = {blueBarTitle: "Patient Picker"};

    }).controller("AfterAuthController", // After auth
        function(fhirApiServices){
            fhirApiServices.initClient();
    }).controller("PatientSearchController",
    function($scope, $rootScope, $state, $filter, $stateParams, fhirApiServices) {

        $scope.onSelected = $scope.onSelected || function(p){
            if ($scope.selected.selectedPatient !== p) {
                $scope.selected.selectedPatient = p;
                $scope.selected.patientSelected = true;
            }
        };

        $scope.mayLoadMore = true;
        $scope.patients = [];
        $scope.genderglyph = {"female" : "&#9792;", "male": "&#9794;"};
        $scope.searchterm = "";
        var lastQueryResult;

        $rootScope.$on('set-loading', function(){
            $scope.showing.searchloading = true;
        });

        /** Checks if the patient list div is (almost) fully visible on screen and if so loads more patients. */
        $scope.loadMoreIfNeeded = function() {
            if (!$scope.mayLoadMore) {
                return;
            }

            // Normalize scrollTop to account for variations in browser behavior (NJS 2015-03-04)
            var scrollTop = (document.documentElement.scrollTop > document.body.scrollTop) ? document.documentElement.scrollTop : document.body.scrollTop;

            var list = $('#patient-results');
            if (list.offset().top + list.height() - 200 - scrollTop <= window.innerHeight) {
                $scope.mayLoadMore = false;
                $scope.loadMoreIfHasMore();
            }
        };

        $scope.loadMoreIfHasMore = function() {
            if ($scope.hasNext()) {
                $scope.loadMore();
            }
        };

        $scope.loadMore = function() {
            $scope.showing.searchloading = true;
            fhirApiServices.getNextOrPrevPage("nextPage", lastQueryResult).then(function(p, queryResult){
                lastQueryResult = queryResult;
                p.forEach(function(v) { $scope.patients.push(v) }, p);
                $scope.showing.searchloading = false;
                $scope.mayLoadMore = true;
                $scope.loadMoreIfNeeded();
                $rootScope.$digest();
            });
        };

        $scope.select = function(i){
            $scope.onSelected($scope.patients[i]);
        };

        $scope.hasNext = function(){
            return fhirApiServices.hasNext(lastQueryResult);
        };

        $scope.$watch("searchterm", function(){
            var tokens = [];
            ($scope.searchterm || "").split(/\s/).forEach(function(t){
                tokens.push(t.toLowerCase());
            });
            $scope.tokens = tokens;
            if ($scope.getMore !== undefined) {
                $scope.getMore();
            }
        });

        var loadCount = 0;
        var search = _.debounce(function(thisLoad){
            fhirApiServices.queryResourceInstances("Patient", undefined, $scope.tokens, [['family','asc'],['given','asc']])
                .then(function(p, queryResult){
                    lastQueryResult = queryResult;
                    if (thisLoad < loadCount) {   // not sure why this is needed (pp)
                        return;
                    }
                    $scope.patients = p;
                    $scope.showing.searchloading = false;
                    $scope.mayLoadMore = true;
                    $scope.loadMoreIfNeeded();
                    $rootScope.$digest();
                });
        }, 300);

        $scope.getMore = function(){
            $scope.showing.searchloading = true;
            search(++loadCount);
        };

        $rootScope.$on('patient-created', function(){
            $scope.getMore();
        });

    }).controller("BindContextController",
    function($scope, fhirApiServices, $stateParams, oauth2, tools) {

        $scope.showing = {
            noPatientContext: true,
            content: false,
            searchloading: true
        };

        $scope.selected = {
            selectedPatient: {},
            patientSelected: false
        };

        if (fhirApiServices.clientInitialized()) {
            // all is good
            $scope.showing.content = true;
        } else {
            // need to complete authorization cycle
            fhirApiServices.initClient();
        }

        $scope.clientName = decodeURIComponent($stateParams.clientName)
            .replace(/\+/, " ");

        $scope.onSelected = $scope.onSelected || function(p){
            var pid = p.id;
            var client_id = tools.decodeURLParam($stateParams.endpoint, "client_id");

            fhirApiServices
                .registerContext({ client_id: client_id}, {patient: pid})
                .then(function(c){
                    var to = decodeURIComponent($stateParams.endpoint);
                    to = to.replace(/scope=/, "launch="+c.launch_id+"&scope=");
                    return window.location = to;
                });
        };
    });

