<%@ page language="java" contentType="application/javascript; charset=UTF-8" pageEncoding="UTF-8"%>
        angular.module('patientPickerApp').constant('envInfo',
                {
                    "hostOrg":          "<%= System.getProperty("hostOrg") %>"
                });
