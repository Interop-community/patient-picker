'use strict';

angular.module('patientPickerApp', ['ui.router', 'ngSanitize', 'ui.bootstrap', 'patientPickerApp.filters', 'patientPickerApp.services',
    'patientPickerApp.controllers'], function($stateProvider, $urlRouterProvider ){

    $urlRouterProvider.otherwise('/resolve');

    $stateProvider
        
        .state('after-auth', {
            url: '/after-auth',
            templateUrl:'static/js/templates/after-auth.html'
        })

        .state('resolve', {
            url: '/resolve/:context/against/:iss/for/:clientName/then/:endpoint',
            templateUrl:'static/js/templates/resolve.html'
        })

        .state('resolve-launch', {
            url: '/resolve/launch/:iss/for/:launch_uri/with/:context_params/and/:patients/then/:endpoint',
            templateUrl:'static/js/templates/resolve.html'
        });
    });
