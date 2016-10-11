<%@ page language="java" contentType="application/javascript; charset=UTF-8" pageEncoding="UTF-8"%>
        angular.module('patientPickerApp').constant('envInfo',
                {
                    "env":          "<%= System.getProperty("hspcEnv") %>",
                    "defaultServiceUrl": "<%= System.getProperty("defaultServiceUrl") %>",
                    "baseServiceUrl": "<%= System.getProperty("baseServiceUrl") %>"
                });
