# network-node-manage-loadbalancer
Getting started on network, particularly managing a LoadBalancer in ARM (V2 REST API) in Azure using node.js

You can use a load balancer to provide high availability for your workloads in Azure. 
An Azure load balancer is a Layer-4 (TCP, UDP) type load balancer that distributes incoming traffic among healthy service instances in cloud services or virtual machines defined in a load balancer set.

The following tasks will be done in this scenario:
* Create a load balancer receiving network traffic on port 80 and send load balanced traffic to virtual machines "web1" and "web2"
* Create NAT rules for remote desktop access/ SSH for virtual machines behind the load balancer
* Create health probes

![alt tag](./lb.JPG)

What is required to create an internet facing load balancer?

You need to create and configure the following objects to deploy a load balancer.

* Front end IP configuration - contains public IP addresses for incoming network traffic. 


* Back end address pool - contains network interfaces (NICs) for the virtual machines to receive network traffic from the load balancer. 


* Load balancing rules - contains rules mapping a public port on the load balancer to port in the back end address pool.


* Inbound NAT rules - contains rules mapping a public port on the load balancer to a port for a specific virtual machine in the back end address pool.


* Probes - contains health probes used to check availability of virtual machines instances in the back end address pool.

You can get more information about load balancer components with Azure resource manager at [Azure Resource Manager support for Load Balancer](https://azure.microsoft.com/en-us/documentation/articles/load-balancer-arm/).

## Tasks done in this sample

1. Create a ResourceGroup
2. Create a Vnet
3. Create a subnet
4. Create a publicIP
5. Build the LoadBalancer Payload
  1. Build a FrontEndIpPool
  2. Build a BackendAddressPool
  3. Build a HealthProbe
  4. Build a LoadBalancerRule
  5. Build InboundNATRule1
  6. Build InboundNATRule2
6. Create the Load Balancer with the above Payload
7. Create NIC1
8. Create NIC2
9. Find an Ubutnu VM Image
10. Create an AvailabilitySet
11. Create the first VM: Web1
12. Create the second VM: Web2

<a id="run"></a>
## Run this sample

1. If you don't already have it, [get node.js](https://nodejs.org).

2. Clone the repository.

    ```
    git clone https://github.com:Azure-Samples/app-service-web-nodejs-manage.git
    ```

3. Install the dependencies.

    ```
    cd app-service-web-nodejs-manage
    npm install
    ```

4. Create an Azure service principal either through
    [Azure CLI](https://azure.microsoft.com/documentation/articles/resource-group-authenticate-service-principal-cli/),
    [PowerShell](https://azure.microsoft.com/documentation/articles/resource-group-authenticate-service-principal/)
    or [the portal](https://azure.microsoft.com/documentation/articles/resource-group-create-service-principal-portal/).

5. Set the following environment variables using the information from the service principle that you created.

    ```
    export AZURE_SUBSCRIPION_ID={your subscription id}
    export CLIENT_ID={your client id}
    export APPLICATION_SECRET={your client secret}
    export DOMAIN={your tenant id as a guid OR the domain name of your org <contosocorp.com>}
    ```

    > [AZURE.NOTE] On Windows, use `set` instead of `export`.

6. Run the sample.

    ```
    node index.js
    ```

7. To clean up after index.js, run the cleanup script.

    ```
    node cleanup.js <resourceGroupName> <websiteName>
    ```


## More information
Please refer to [Azure SDK for Node](https://github.com/Azure/azure-sdk-for-node) for more information.
