/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */
'use strict';

var util = require('util');
var { ClientSecretCredential }= require('@azure/identity');
var { ResourceManagementClient } = require('@azure/arm-resources');

_validateEnvironmentVariables();
_validateParameters();
var clientId = process.env['CLIENT_ID'];
var domain = process.env['DOMAIN'];
var secret = process.env['APPLICATION_SECRET'];
var subscriptionId = process.env['AZURE_SUBSCRIPTION_ID'];
var resourceGroupName = process.argv[2];
var vmName = process.argv[3];
var resourceClient;

async function deleteResourceGroup() {
  console.log('\nDeleting resource group: ' + resourceGroupName);
  return await resourceClient.resourceGroups.beginDeleteAndWait(resourceGroupName);
}


function _validateEnvironmentVariables() {
  var envs = [];
  if (!process.env['CLIENT_ID']) envs.push('CLIENT_ID');
  if (!process.env['DOMAIN']) envs.push('DOMAIN');
  if (!process.env['APPLICATION_SECRET']) envs.push('APPLICATION_SECRET');
  if (!process.env['AZURE_SUBSCRIPTION_ID']) envs.push('AZURE_SUBSCRIPTION_ID');
  if (envs.length > 0) {
    throw new Error(util.format('please set/export the following environment variables: %s', envs.toString()));
  }
}

function _validateParameters() {
  if (!process.argv[2]) {
    throw new Error('Please provide the resource group by executing the script as follows: "node cleanup.js <resourceGroupName>".');
  }
}

//Entrypoint of the cleanup script
try{
  const credentials = new ClientSecretCredential(domain,clientId,secret);
  resourceClient = new ResourceManagementClient(credentials, subscriptionId);
  console.log('\nDeleting the resource group can take few minutes, so please be patient :).');

  deleteResourceGroup().then((result)=>{
    console.log('Successfully deleted the resourcegroup: ' + resourceGroupName);
  },(err)=>{
    return console.log('Error occured in deleting the resource group: ' + resourceGroupName + '\n' + util.inspect(err, { depth: null }));
  });

}catch(err){
  console.log(err);
}
