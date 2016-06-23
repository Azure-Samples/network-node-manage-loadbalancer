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
var location = 'westus';
var accType = 'Standard_LRS';
var resourceGroupName = _generateRandomId('testrg', randomIds);
var vmName1 = 'testvm1';
var vmName2 = 'testvm2';
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

var adminUsername = 'notadmin';
var adminPassword = 'Pa$$w0rd92';


///////////////////////////////////////////
//     Entrypoint for sample script      //
///////////////////////////////////////////

msRestAzure.loginWithServicePrincipalSecret(clientId, secret, domain, function (err, credentials, subscriptions) {
  if (err) return console.log(err);
  resourceClient = new ResourceManagementClient(credentials, subscriptionId);
  computeClient = new ComputeManagementClient(credentials, subscriptionId);
  storageClient = new StorageManagementClient(credentials, subscriptionId);
  networkClient = new NetworkManagementClient(credentials, subscriptionId);
  var vnet, subnet, nic1, nic2, vm1, vm2, publicIP, lb, frontendIpPool, backendAdressPool, probe, natRule1, natRule2, lbRule;
  async.series([
    function (callback) {
      createResourceGroup(function (err, result) {
        if (err) {
          console.log(util.format('\n???????Error occurred while creating a resource group:\n%s', 
            util.inspect(err, { depth: null })));
          callback(err);
        } else {
          console.log(util.format('\nThe resource group has been successfully created: \n%s', 
            util.inspect(result, { depth: null })));
          callback(null, result);
        }
      });
    },
    function (callback) {
      createVnet(function (err, result) {
        if (err) {
          console.log(util.format('\n???????Error occurred while creating the vnet:\n%s', 
            util.inspect(err, { depth: null })));
          callback(err);
        } else {
          vnet = result;
          console.log(util.format('\nThe vnet has been successfully created: \n%s', 
            util.inspect(vnet, { depth: null })));
          callback(null, vnet);
        }
      });
    },
    function (callback) {
      createSubnet(function (err, result) {
        if (err) {
          console.log(util.format('\n???????Error occurred while creating the subnet:\n%s', 
            util.inspect(err, { depth: null })));
          callback(err);
        } else {
          subnet = result;
          console.log(util.format('\nThe subnet has been successfully created: \n%s', 
            util.inspect(subnet, { depth: null })));
          callback(null, subnet);
        }
      });
    },
    function (callback) {
      createPublicIP(function (err, result) {
        if (err) {
          console.log(util.format('\n???????Error occurred while creating the public ip:\n%s', 
            util.inspect(err, { depth: null })));
          callback(err);
        } else {
          publicIP = result;
          console.log(util.format('\nThe public ip has been successfully created: \n%s', 
            util.inspect(publicIP, { depth: null })));
          callback(null, publicIP);
        }
      });
    },
    function (callback) {
      createFrontEndIpPool(publicIP, function (err, result) {
        if (err) {
          console.log(util.format('\n???????Error occurred while creating the front end IP pool:\n%s', 
            util.inspect(err, { depth: null })));
          callback(err);
        } else {
          frontendIpPool = result;
          console.log(util.format('\nThe front end IP pool has been successfully created: \n%s', 
            util.inspect(frontendIpPool, { depth: null })));
          callback(null, frontendIpPool);
        }
      });
    },
    function (callback) {
      createBackendAdressPool(function (err, result) {
        if (err) {
          console.log(util.format('\n???????Error occurred while creating the backend address pool:\n%s', 
            util.inspect(err, { depth: null })));
          callback(err);
        } else {
          backendAdressPool = result;
          console.log(util.format('\nThe backend address pool has been successfully created: \n%s', 
            util.inspect(backendAdressPool, { depth: null })));
          callback(null, backendAdressPool);
        }
      });
    },
    function (callback) {
      createHealthProbe(function (err, result) {
        if (err) {
          console.log(util.format('\n???????Error occurred while creating the health probe:\n%s', 
            util.inspect(err, { depth: null })));
          callback(err);
        } else {
          probe = result;
          console.log(util.format('\nThe health probe has been successfully created: \n%s', 
            util.inspect(probe, { depth: null })));
          callback(null, probe);
        }
      });
    },
    function (callback) {
      createLoadBalancerRule(frontendIpPool.id, backendAdressPool.id, probe.id, function (err, result) {
        if (err) {
          console.log(util.format('\n???????Error occurred while creating the load balancer rule:\n%s', 
            util.inspect(err, { depth: null })));
          callback(err);
        } else {
          lbRule = result;
          console.log(util.format('\nThe load balancer rule has been successfully created: \n%s', 
            util.inspect(lbRule, { depth: null })));
          callback(null, lbRule);
        }
      });
    },
    function (callback) {
      createInboundNatRule(natruleName1, frontendPort1, backendPort, frontendIpPool.id, backendAdressPool.id, function (err, result) {
        if (err) {
          console.log(util.format('\n???????Error occurred while creating the inbound nat rule1:\n%s', 
            util.inspect(err, { depth: null })));
          callback(err);
        } else {
          natRule1 = result;
          console.log(util.format('\nThe inbound nat rule1 has been successfully created: \n%s', 
            util.inspect(natRule1, { depth: null })));
          callback(null, natRule1);
        }
      });
    },
    function (callback) {
      createInboundNatRule(natruleName2, frontendPort2, backendPort, frontendIpPool.id, backendAdressPool.id, function (err, result) {
        if (err) {
          console.log(util.format('\n???????Error occurred while creating the inbound nat rule2:\n%s', 
            util.inspect(err, { depth: null })));
          callback(err);
        } else {
          natRule2 = result;
          console.log(util.format('\nThe inbound nat rule2 has been successfully created: \n%s', 
            util.inspect(natRule2, { depth: null })));
          callback(null, natRule2);
        }
      });
    }
  ],
  //final callback to be run after all the tasks
  function (err, results) {
    if (err) {
      console.log(util.format('\n??????Error occurred in one of the operations.\n%s', 
        util.inspect(err, { depth: null })));
    } else {
      console.log('\n######All the operations have completed successfully.');
      console.log(util.format('\n\n-->Please execute the following script for cleanup:\nnode cleanup.js %s', resourceGroupName));
    }
    return;
  });
});

// Helper functions
function createVM(finalCallback) {
  //We could have had an async.series over here as well. However, we chose to nest
  //the callbacks to showacase a different pattern in the sample.
  createStorageAccount(function (err, accountInfo) {
    if (err) return finalCallback(err);
    findVMImage(function (err, vmImageInfo) {
      if (err) return finalCallback(err);
      console.log('\nFound Vm Image:\n' + util.inspect(vmImageInfo, { depth: null }));
      createVirtualMachine(nicInfo.id, vmImageInfo[0].name, function (err, vmInfo) {
        if (err) return finalCallback(err);
        return finalCallback(null, vmInfo);
      });
    });
  });
}

function createResourceGroup(callback) {
  var groupParameters = { location: location, tags: { sampletag: 'sampleValue' } };
  console.log('\n1.Creating resource group: ' + resourceGroupName);
  return resourceClient.resourceGroups.createOrUpdate(resourceGroupName, groupParameters, callback);
}

function createStorageAccount(storageAccountName, callback) {
  console.log('\n2.Creating storage account: ' + storageAccountName);
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
  var vnetParameters = {
    location: location,
    addressSpace: {
      addressPrefixes: ['10.0.0.0/16']
    }
  };
  console.log('\n3.Creating vnet: ' + vnetName);
  return networkClient.virtualNetworks.createOrUpdate(resourceGroupName, vnetName, vnetParameters, callback);
}

function createSubnet(callback) {
  console.log('\nCreating subnet: ' + subnetName);
  var subnetParameters = {
    addressPrefix: '10.0.0.0/24'
  };
  return networkClient.subnets.createOrUpdate(resourceGroupName, vnetName, subnetName, subnetParameters, callback);
}

function getSubnetInfo(callback) {
  console.log('\nGetting subnet info for: ' + subnetName);
  return networkClient.subnets.get(resourceGroupName, vnetName, subnetName, callback);
}

function createPublicIP(callback) {
  var publicIPParameters = {
    location: location,
    publicIPAllocationMethod: 'static',
    dnsSettings: {
      domainNameLabel: domainNameLabel
    },
    idleTimeoutInMinutes: 4
  };
  console.log('\nCreating public IP: ' + publicIPName);
  return networkClient.publicIPAddresses.createOrUpdate(resourceGroupName, publicIPName, publicIPParameters, callback);
}

function createLoadBalancer(callback) {
  var parameters = { location: location };
  console.log('\nCreating Load Balancer: ' + loadBalancerName);
  return networkClient.loadBalancers.createOrUpdate(resourceGroupName, loadBalancerName, parameters, callback);
}

function createFrontEndIpPool(publicIPInfo, callback) {
  console.log('\nCreating FrontEndIp pool: ' + fipName + ' on the load balancer: ' + loadBalancerName);
  var parameters = {
    frontendIPConfigurations: [
      {
        name: fipName,
        privateIPAllocationMethod: 'Dynamic',
        publicIPAddress: {
          id: publicIPInfo.id
        }
      }
    ]
  }
  return networkClient.loadBalancers.createOrUpdate(resourceGroupName, loadBalancerName, parameters, callback);
}

function createBackendAdressPool(callback) {
  console.log('\nCreating BackendAdress pool: ' + addressPoolName + ' on the load balancer: ' + loadBalancerName);
  var parameters = {
    backendAddressPools: [
      {
        name: addressPoolName
      }
    ]
  };
  return networkClient.loadBalancers.createOrUpdate(resourceGroupName, loadBalancerName, parameters, callback);
}

function createHealthProbe(callback) {
  console.log('\nCreating a health probe: ' + probeName);
  var parameters = {
    probes: [
      {
        name: probeName,
        protocol: 'Http',
        port: 80,
        intervalInSeconds: 15,
        numberOfProbes: 4,
        requestPath: 'healthprobe.aspx'
      }
    ]
  };
  return networkClient.loadBalancers.createOrUpdate(resourceGroupName, loadBalancerName, parameters, callback);
}

function createLoadBalancerRule(frontendIpPoolId, backendAddressPoolId, probeId, callback) {
  console.log('\nCreating a load balancer rule: ' + lbruleName);
  var parameters = {
    loadBalancingRules: [
      {
        name: lbruleName,
        protocol: 'tcp',
        frontendPort: 80,
        backendPort: 80,
        idleTimeoutInMinutes: 4,
        enableFloatingIP: false,
        loadDistribution: 'Default',
        frontendIPConfiguration: {
          id: frontendIpPoolId
        },
        backendAddressPool: {
          id: backendAddressPoolId
        },
        probe: {
          id: probeId
        }
      }
    ]
  };
  return networkClient.loadBalancers.createOrUpdate(resourceGroupName, loadBalancerName, parameters, callback);
}

function createInboundNatRule(rulename, frontendPort, backendPort, frontendIpPoolId, backendAddressPoolId, callback) {
  console.log('\nCreating an inbound NAT rule: ' + rulename);
  var parameters = {
    inboundNatRules: [
      {
        name: rulename,
        protocol: 'tcp',
        frontendPort: frontendPort,
        backendPort: backendPort,
        enableFloatingIP: false,
        idleTimeoutInMinutes: 4,
        frontendIPConfiguration: {
          id: frontendIpPoolId
        },
        backendAddressPool: {
          id: backendAddressPoolId
        }
      }
    ]
  };
  return networkClient.loadBalancers.createOrUpdate(resourceGroupName, loadBalancerName, parameters, callback);
}

function getLoadBalancerInfo(callback) {
  console.log('\nGetting information about load balancer: ' + loadBalancerName);
  return networkClient.loadBalancers.get(resourceGroupName, loadBalancerName, callback);
}

function createNIC(networkInterfaceName, subnetId, addressPoolId, natruleId, callback) {
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
  console.log('\nCreating Network Interface: ' + networkInterfaceName);
  return networkClient.networkInterfaces.createOrUpdate(resourceGroupName, networkInterfaceName, nicParameters, callback);
}

function findVMImage(callback) {
  console.log(util.format('\nFinding a VM Image for location %s from ' + 
                    'publisher %s with offer %s and sku %s', location, publisher, offer, sku));
  return computeClient.virtualMachineImages.list(location, publisher, offer, sku, { top: 1 }, callback);
}

function getNICInfo(callback) {
  return networkClient.networkInterfaces.get(resourceGroupName, networkInterfaceName, callback);
}

function createAvailabilitySet(callback) {
  console.log('\nCreating availabitily set: ' + availsetName);
  var parameters = {};
  computeClient.availabilitySets.createOrUpdate(resourceGroupName, availsetName, parameters, callback);
}

function createVirtualMachine(nicId, vmImageVersionNumber, storageAccountName, vmName, callback) {
  var vmParameters = {
    location: location,
    osProfile: {
      computerName: vmName,
      adminUsername: adminUsername,
      adminPassword: adminPassword
    },
    hardwareProfile: {
      vmSize: 'Basic_A0'
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
    }
  };
  console.log('\n6.Creating Virtual Machine: ' + vmName);
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
