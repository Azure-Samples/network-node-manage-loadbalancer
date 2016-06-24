/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 */
'use strict';

var util = require('util');
var async = require('async');
var msRestAzure = require('ms-rest-azure');
var ComputeManagementClient = require('azure-arm-compute');
var StorageManagementClient = require('azure-arm-storage');
var NetworkManagementClient = require('azure-arm-network');
var ResourceManagementClient = require('azure-arm-resource').ResourceManagementClient;

_validateEnvironmentVariables();
var clientId = process.env['CLIENT_ID'];
var domain = process.env['DOMAIN'];
var secret = process.env['APPLICATION_SECRET'];
var subscriptionId = process.env['AZURE_SUBSCRIPTION_ID'];
var resourceClient, computeClient, storageClient, networkClient;
//Sample Config
var randomIds = {};
var location = 'southcentralus';
var accType = 'Standard_LRS';
var resourceGroupName = _generateRandomId('testrg', randomIds);
var vmName1 = 'web1';
var vmName2 = 'web2';
var storageAccountName1 = _generateRandomId('testac1', randomIds);
var storageAccountName2 = _generateRandomId('testac2', randomIds);
var vnetName = _generateRandomId('testvnet', randomIds);
var subnetName = _generateRandomId('testsubnet', randomIds);
var publicIPName = _generateRandomId('testpip', randomIds);
var ipConfigName = _generateRandomId('testcrpip', randomIds);
var domainNameLabel = _generateRandomId('testdomainname', randomIds);
var loadBalancerName = _generateRandomId('testlb', randomIds);
var fipName = _generateRandomId('testfip', randomIds);
var addressPoolName = _generateRandomId('testbackendpool', randomIds);
var probeName = _generateRandomId('testprobe', randomIds);
var lbruleName = _generateRandomId('testlbrule', randomIds);
var natruleName1 = _generateRandomId('testnatrule1', randomIds);
var natruleName2 = _generateRandomId('testnatrule2', randomIds);
var networkInterfaceName1 = _generateRandomId('testnic1', randomIds);
var networkInterfaceName2 = _generateRandomId('testnic2', randomIds);
var osDiskName = _generateRandomId('testosdisk', randomIds);
var availsetName = _generateRandomId('testavailset', randomIds);
var frontendPort1 = 21, backendPort = 22, frontendPort2 = 23;
// Ubuntu config
var publisher = 'Canonical';
var offer = 'UbuntuServer';
var sku = '14.04.3-LTS';
var osType = 'Linux';

// Windows config
//var publisher = 'microsoftwindowsserver';
//var offer = 'windowsserver';
//var sku = '2012-r2-datacenter';
//var osType = 'Windows';

var adminUsername1 = 'notadmin1';
var adminPassword1 = 'Pa$$w0rd91';
var adminUsername2 = 'notadmin2';
var adminPassword2 = 'Pa$$w0rd92';

///////////////////////////////////////////
//     Entrypoint for sample script      //
///////////////////////////////////////////

msRestAzure.loginWithServicePrincipalSecret(clientId, secret, domain, function (err, credentials, subscriptions) {
  if (err) return console.log(err);
  resourceClient = new ResourceManagementClient(credentials, subscriptionId);
  computeClient = new ComputeManagementClient(credentials, subscriptionId);
  storageClient = new StorageManagementClient(credentials, subscriptionId);
  networkClient = new NetworkManagementClient(credentials, subscriptionId);
  var loadBalancerPayload = { location: location };
  var rgInfo, vnetInfo, subnetInfo, publicIPInfo, finalLB, nicInfo1, nicInfo2, vmImageInfo, availsetInfo, vmInfo1, vmInfo2;
  async.waterfall([
    function (callback) {
      createResourceGroup(logOutcome(util.format('creating ResourceGroup %s', resourceGroupName), callback));
    },
    function (rg, callback) {
      rgInfo = rg;
      createVnet(logOutcome(util.format('creating Vnet %s', vnetName), callback));
    },
    function (vnet, callback) {
      vnetInfo = vnet;
      createSubnet(logOutcome(util.format('creating Subnet %s', subnetName), callback));
    },
    function (subnet, callback) {
      subnetInfo = subnet;
      createPublicIP(logOutcome(util.format('creating PublicIP %s', publicIPName), callback));
    },
    function (publicIP, callback) {
      publicIPInfo = publicIP;
      console.log(util.format('\n5. Building a FrontEndIpPool: %s on the load balancer: %s', fipName, loadBalancerName));
      loadBalancerPayload.frontendIPConfigurations = [
        {
          name: fipName,
          privateIPAllocationMethod: 'Dynamic',
          publicIPAddress: {
            id: publicIPInfo.id
          }
        }
      ];
      console.log(util.inspect(loadBalancerPayload, { depth: null }));
      return callback(null, loadBalancerPayload);
    },
    function (lb, callback) {
      console.log(util.format('\n6. Building a BackendAddressPool: %s on the load balancer: %s.\n', addressPoolName, loadBalancerName));
      loadBalancerPayload.backendAddressPools = [
        {
          name: addressPoolName
        }
      ];
      console.log(util.inspect(loadBalancerPayload, { depth: null }));
      return callback(null, loadBalancerPayload);
    },
    function (lb, callback) {
      console.log(util.format('\n7. Building a HealthProbe: %s on the load balancer: %s.\n', probeName, loadBalancerName));
      loadBalancerPayload.probes = [
        {
          name: probeName,
          protocol: 'Http',
          port: 80,
          intervalInSeconds: 15,
          numberOfProbes: 4,
          requestPath: 'healthprobe.aspx'
        }
      ];
      console.log(util.inspect(loadBalancerPayload, { depth: null }));
      return callback(null, loadBalancerPayload);
    },
    function (lb, callback) {
      console.log(util.format('\n8. Building a LoadBalancerRule: %s on the load balancer: %s.\n', lbruleName, loadBalancerName));
      loadBalancerPayload.loadBalancingRules = [
        {
          name: lbruleName,
          protocol: 'tcp',
          frontendPort: 80,
          backendPort: 80,
          idleTimeoutInMinutes: 4,
          enableFloatingIP: false,
          loadDistribution: 'Default',
          frontendIPConfiguration: {
            id: constructFipId()
          },
          backendAddressPool: {
            id: constructBapId()
          },
          probe: {
            id: constructProbeId()
          }
        }
      ];
      console.log(util.inspect(loadBalancerPayload, { depth: null }));
      return callback(null, loadBalancerPayload);
    },
    function (lb, callback) {
      console.log(util.format('\n9. Building InboundNATRule1: %s on the load balancer: %s.\n', natruleName1, loadBalancerName));
      var natRule1Params = {
        name: natruleName1,
        protocol: 'tcp',
        frontendPort: frontendPort1,
        backendPort: backendPort,
        enableFloatingIP: false,
        idleTimeoutInMinutes: 4,
        frontendIPConfiguration: {
          id: constructFipId()
        }
      };
      loadBalancerPayload.inboundNatRules = [];
      loadBalancerPayload.inboundNatRules.push(natRule1Params);
      console.log(util.inspect(loadBalancerPayload, { depth: null }));
      return callback(null, loadBalancerPayload);
    },
    function (lb, callback) {
      console.log(util.format('\n10. Building InboundNATRule2: %s on the load balancer: %s.\n', natruleName2, loadBalancerName));
      var natRule2Params = {
        name: natruleName2,
        protocol: 'tcp',
        frontendPort: frontendPort2,
        backendPort: backendPort,
        enableFloatingIP: false,
        idleTimeoutInMinutes: 4,
        frontendIPConfiguration: {
          id: constructFipId()
        }
      };
      loadBalancerPayload.inboundNatRules.push(natRule2Params);
      console.log(util.inspect(loadBalancerPayload, { depth: null }));
      return callback(null, loadBalancerPayload);
    },
    function (lb, callback) {
      createLoadBalancer(loadBalancerPayload, logOutcome(util.format('creating LoadBalancer: %s', loadBalancerName), callback));
    },
    function (lb, callback) {
      finalLB = lb;
      createNIC(13, networkInterfaceName1, subnetInfo.id, finalLB.backendAddressPools[0].id, finalLB.inboundNatRules[0].id, 
        logOutcome(util.format('creating NetworkInterface1: %s', networkInterfaceName1), callback));
    },
    function (nic1, callback) {
      nicInfo1 = nic1;
      createNIC(14, networkInterfaceName2, subnetInfo.id, finalLB.backendAddressPools[0].id, finalLB.inboundNatRules[1].id, 
        logOutcome(util.format('creating NetworkInterface2: %s', networkInterfaceName2), callback));
    },
    function (nic2, callback) {
      nicInfo2 = nic2;
      findVMImage(logOutcome(util.format('finding VM Image'), callback));
    },
    function (vmImage, callback) {
      vmImageInfo = vmImage;
      createAvailabilitySet(logOutcome(util.format(' creating Availabilityset: %s', availsetName), callback));
    },
    function (availset, callback) {
      availsetInfo = availset;
      createVM(17, nicInfo1.id, availsetInfo.id, vmImageInfo[0].name, storageAccountName1, vmName1, adminUsername1, adminPassword1,
        logOutcome(util.format(' creating VM1: %s', vmName1), callback));
    },
    function (vm1, callback) {
      vmInfo1 = vm1;
      createVM(18, nicInfo2.id, availsetInfo.id, vmImageInfo[0].name, storageAccountName2, vmName2, adminUsername2, adminPassword2,
        logOutcome(util.format('creating VM2: %s', vmName2), callback));
    }
  ],
  //final callback to be run after all the tasks
  function (err, vm2) {
    if (err) {
      console.log(util.format('\n??????Error occurred in one of the operations.\n%s', 
        util.inspect(err, { depth: null })));
    } else {
      vmInfo2 = vm2;
      console.log('\n######All the operations have completed successfully.######');
      provideVMLoginInfoToUser('first', vmName1, frontendPort1, adminUsername1, adminPassword1);
      provideVMLoginInfoToUser('second', vmName2, frontendPort2, adminUsername2, adminPassword2);
      console.log(util.format('\n\n-->\tPlease execute the following script for cleanup:\n\n\t\t\tnode cleanup.js %s', resourceGroupName));
    }
    return;
  });
});

function provideVMLoginInfoToUser(num, vmName, frontendPort, adminUsername, adminPassword) {
  console.log(util.format('\n\nLogin information for the %s VM: %s', num, vmName));
  console.log('_____________________________________________________');
  console.log(util.format('ssh to ip:port - %s:%s\n', publicIPInfo.ipAddress, frontendPort));
  console.log(util.format('username       - %s\n', adminUsername));
  console.log(util.format('password       - %s\n', adminPassword));
  return;
}

// Helper functions
function constructFipId() {
  return util.format('/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Network/loadBalancers/%s/frontendIPConfigurations/%s', 
    subscriptionId, resourceGroupName, loadBalancerName, fipName);
}

function constructBapId() {
  return util.format('/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Network/loadBalancers/%s/backendAddressPools/%s', 
    subscriptionId, resourceGroupName, loadBalancerName, addressPoolName);
}

function constructProbeId() {
  return util.format('/subscriptions/%s/resourceGroups/%s/providers/Microsoft.Network/loadBalancers/%s/probes/%s', 
    subscriptionId, resourceGroupName, loadBalancerName, probeName);
}

function logOutcome(text, callback) {
  return function (err, result, req, res) {
    if (err) {
      console.log(util.format('\n???????Error in %s:\n%s\n', text, util.inspect(err, { depth: null })));
      return callback(err);
    } else {
      console.log(util.format('\nSuccessful in %s: \n%s\n', text, util.inspect(result, { depth: null })));
      return callback(null, result);
    }
  }
}

function createVM(num, nicId, availsetId, vmImageVersionNumber, storageAccountName, vmName, adminUsername, adminPassword, finalCallback) {
  createStorageAccount(storageAccountName, function (err, accountInfo) {
    if (err) return finalCallback(err);
    createVirtualMachine(num, nicId, availsetId, vmImageVersionNumber, storageAccountName, vmName, adminUsername, adminPassword, function (err, vmInfo) {
      if (err) return finalCallback(err);
      return finalCallback(null, vmInfo);
    });
  });
}

function createResourceGroup(callback) {
  var groupParameters = { location: location, tags: { sampletag: 'sampleValue' } };
  console.log('\n1. Creating resource group: ' + resourceGroupName);
  return resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, callback);
}

function createStorageAccount(storageAccountName, callback) {
  console.log('\n. Creating storage account: ' + storageAccountName);
  var createParameters = {
    location: location,
    sku: {
      name: accType,
    },
    kind: 'Storage',
    tags: {
      tag1: 'val1',
      tag2: 'val2'
    }
  };
  return storageClient.storageAccounts.create(resourceGroupName, storageAccountName, createParameters, callback);
}

function createVnet(callback) {
  console.log('\n2. Creating Vnet: ' + vnetName);
  var vnetParameters = {
    location: location,
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
  };
  return networkClient.virtualNetworks.createOrUpdate(resourceGroupName, vnetName, vnetParameters, callback);
}

function createSubnet(callback) {
  console.log('\n3. Creating subnet: ' + subnetName);
  var subnetParameters = {
    addressPrefix: '10.0.0.0/24'
  };
  return networkClient.subnets.createOrUpdate(resourceGroupName, vnetName, subnetName, subnetParameters, callback);
}

function createPublicIP(callback) {
  console.log('\n4. Creating public IP: ' + publicIPName);
  var publicIPParameters = {
    location: location,
    publicIPAllocationMethod: 'static',
    dnsSettings: {
      domainNameLabel: domainNameLabel
    },
    idleTimeoutInMinutes: 4
  };
  return networkClient.publicIPAddresses.createOrUpdate(resourceGroupName, publicIPName, publicIPParameters, callback);
}

function createLoadBalancer(loadBalancerCreateParameters, callback) {
  console.log(util.format('\n11. Creating Load Balancer: %s with payload: \n%s\n'), loadBalancerName, util.inspect(loadBalancerCreateParameters, { depth: null }));
  return networkClient.loadBalancers.createOrUpdate(resourceGroupName, loadBalancerName, loadBalancerCreateParameters, callback);
}


function getLoadBalancerInfo(callback) {
  console.log('\n12. Getting information about load balancer: ' + loadBalancerName);
  return networkClient.loadBalancers.get(resourceGroupName, loadBalancerName, callback);
}

function createNIC(num, networkInterfaceName, subnetId, addressPoolId, natruleId, callback) {
  var nicParameters = {
    location: location,
    ipConfigurations: [
      {
        name: ipConfigName,
        subnet: {
          id: subnetId
        },
        loadBalancerBackendAddressPools: [
          {
            id: addressPoolId
          }
        ],
        loadBalancerInboundNatRules: [
          {
            id: natruleId
          }
        ]
      }
    ]
  };
  console.log('\n' + num + '. Creating Network Interface: ' + networkInterfaceName);
  return networkClient.networkInterfaces.createOrUpdate(resourceGroupName, networkInterfaceName, nicParameters, callback);
}

function findVMImage(callback) {
  console.log(util.format('\n15. Finding a VM Image for location %s from ' + 
                    'publisher %s with offer %s and sku %s', location, publisher, offer, sku));
  return computeClient.virtualMachineImages.list(location, publisher, offer, sku, { top: 1 }, callback);
}

function getNICInfo(callback) {
  return networkClient.networkInterfaces.get(resourceGroupName, networkInterfaceName, callback);
}

function createAvailabilitySet(callback) {
  console.log('\n16. Creating availabitily set: ' + availsetName);
  var parameters = {location: location};
  computeClient.availabilitySets.createOrUpdate(resourceGroupName, availsetName, parameters, callback);
}

function createVirtualMachine(num, nicId, availsetId, vmImageVersionNumber, storageAccountName, vmName, adminUsername, adminPassword, callback) {
  var vmParameters = {
    location: location,
    osProfile: {
      computerName: vmName,
      adminUsername: adminUsername,
      adminPassword: adminPassword
    },
    hardwareProfile: {
      vmSize: 'Standard_DS1'
    },
    storageProfile: {
      imageReference: {
        publisher: publisher,
        offer: offer,
        sku: sku,
        version: vmImageVersionNumber
      },
      osDisk: {
        name: osDiskName,
        caching: 'None',
        createOption: 'fromImage',
        vhd: { uri: 'https://' + storageAccountName + '.blob.core.windows.net/nodejscontainer/osnodejslinux.vhd' }
      },
    },
    networkProfile: {
      networkInterfaces: [
        {
          id: nicId,
          primary: true
        }
      ]
    },
    availabilitySet: {
      id: availsetId
    }
  };
  console.log('\n' + num + '.Creating Virtual Machine: ' + vmName);
  console.log('\n VM create parameters: ' + util.inspect(vmParameters, { depth: null }));
  computeClient.virtualMachines.createOrUpdate(resourceGroupName, vmName, vmParameters, callback);
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

function _generateRandomId(prefix, exsitIds) {
  var newNumber;
  while (true) {
    newNumber = prefix + Math.floor(Math.random() * 10000);
    if (!exsitIds || !(newNumber in exsitIds)) {
      break;
    }
  }
  return newNumber;
}
