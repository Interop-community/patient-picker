'use strict';

angular.module('patientPickerApp', ['ui.router', 'ngSanitize', 'ui.bootstrap', 'patientPickerApp.filters', 'patientPickerApp.services',
    'patientPickerApp.controllers', 'patientPickerApp.directives', 'patientPickerApp.branding'], function($stateProvider, $urlRouterProvider ){

    $urlRouterProvider.otherwise('/resolve');

    $stateProvider
        
        .state('after-auth', {
            url: '/after-auth',
            templateUrl:'js/templates/after-auth.html'
        })

        .state('resolve', {
            url: '/resolve/:context/against/:iss/for/:clientName/then/:endpoint',
            templateUrl:'js/templates/resolve.html'
        })

        .state('resolve-launch', {
            url: '/resolve/launch/:iss/for/:launch_uri/with/:context_params/and/:patients/show/:show_patient_id/then/:endpoint',
            templateUrl:'js/templates/resolve.html'
        });

    var re = /^\?path=(.+)/i;

    $urlRouterProvider.rule(function ($injector, $location) {
        // what this function returns will be set as the $location.url
        var path = window.location.search;
        var matches = path.match(re);
        if (matches) {
            console.log(matches);
            path = matches[1];
            return path;
        }
    });


});
