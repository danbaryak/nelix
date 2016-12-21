import { ServiceDefinition, ServiceDependencyConfig, ServiceConfiguration, 
    Symbols, CommandConfig, ResourceConfig, ExtenderConfig, ExtensionPointConfig } from '.';

import * as _ from 'lodash';

export class DependencyDescriptor {
    serviceName: string;
    fieldName: string;
    satisfied: boolean = false;
    required: boolean = true;
    dependeingServiceSid: number;

    equals(other: DependencyDescriptor) {
        return this.serviceName == other.serviceName &&
            this.fieldName == other.fieldName &&
            this.dependeingServiceSid == other.dependeingServiceSid;    
    }
}

export class ExtenderDescriptor {
    serviceId: number;
    methodName: string;
    satisfied: boolean = false;
    config: any;
}

export class ExtensionPointDescriptor {
    serviceId: number;
    methodName: string;
}

export class ServiceDescriptor {

    sid: number;
    
    prototype: any;

    serviceInstance: any;

    config: ServiceConfiguration;

    unsatisfiedCount: number = 0;

    initMethodName: string;
    
    constructor(service: any) {
        this.serviceInstance = service;
    }

}

export class DependencyManager {

    public static instance: DependencyManager = new DependencyManager();

    servicesById: { [key: number] : ServiceDescriptor } = {};
    servicesByType: { [key: string] : ServiceDescriptor } = {};

    private inDependencies: { [key: string] : DependencyDescriptor[] } = {};
    private outDependencies: { [key: string] : DependencyDescriptor[] } = {};
    private serviceCount = 0;

    private extenders: { [key: string]: ExtenderDescriptor[] } = {};
    private extensionPoints: { [key: string]: ExtensionPointDescriptor[] } = {};

    private constructor() {
        
    }

    registerService(service: any, config: ServiceConfiguration): void {
        let serviceInstance: any = Object.create(service.prototype);
        serviceInstance.constructor.apply(serviceInstance);
        this.registerServiceInstance(service, serviceInstance, config);
    }

    registerServiceInstance(service: any, serviceInstance: any, config: ServiceConfiguration): void {
        
        let descriptor: ServiceDescriptor = new ServiceDescriptor(serviceInstance);
        
        descriptor.prototype = service;
        descriptor.config = config;
        descriptor.sid = this.serviceCount++;

        
        for (let prop in serviceInstance) {
        
            if (Reflect.getMetadata(Symbols.INIT_METHOD, serviceInstance, prop)) {
                // console.log('init method');
                descriptor.initMethodName = prop;
            }
            
            let serviceDependency: ServiceDependencyConfig = Reflect.getMetadata(Symbols.DEPENDENCY, serviceInstance, prop);
            if (serviceDependency) {
                // console.log('has a service dependency! ', serviceDependency);
                
                descriptor.unsatisfiedCount++;
                
                let depDescriptor: DependencyDescriptor = new DependencyDescriptor();
                depDescriptor.fieldName = prop;
                depDescriptor.serviceName = service.name;
                depDescriptor.dependeingServiceSid = descriptor.sid;
                this.getServicesDependingOn(serviceDependency.class.name).push(depDescriptor);

                let outDepDescriptor: DependencyDescriptor = new DependencyDescriptor();
                outDepDescriptor.fieldName = prop;
                outDepDescriptor.serviceName = serviceDependency.class.name;
                outDepDescriptor.dependeingServiceSid = descriptor.sid;
                this.getDependenciesFor(descriptor.sid).push(outDepDescriptor);
            }
        }

        if (config.implements) {
            _.each(config.implements, type => {
                // console.log('implements type ', type.name); 
                this.servicesByType[type.name] = descriptor; 
            });
        }

        this.servicesByType[service.name] = descriptor;
        this.servicesById[descriptor.sid] = descriptor;

        this.resolve(descriptor);
    }
    
    private getServicesDependingOn(serviceName: string) {
        let descriptors: DependencyDescriptor[] = this.inDependencies[serviceName];
        if (! descriptors) {
            descriptors = [];
            this.inDependencies[serviceName] = descriptors;
        }
        return descriptors;
    }

    /**
     * Returns a list of dependencies outgoing from the service with the specified sid.
     */
    private getDependenciesFor(sid: number) {
        let descriptors: DependencyDescriptor[] = this.outDependencies[sid];
        if (! descriptors) {
            descriptors = [];
            this.outDependencies[sid] = descriptors;
        }
        return descriptors;
    }

    /**
     *  Resolves a newly added service.
     */
    private resolve(descriptor: ServiceDescriptor, visitedDependencies: DependencyDescriptor[] = []): void {
        // let out = descriptor.prototype.name === 'Application';
        // out && console.log('resolving Application');
        if (descriptor.unsatisfiedCount > 0) {
            _(this.getDependenciesFor(descriptor.sid)).forEach(dep => {
                // out && console.log(dep);
                let requiredService: ServiceDescriptor = this.servicesByType[dep.serviceName];
                
                if (! dep.satisfied && requiredService && requiredService.unsatisfiedCount == 0) {
                    // out && console.log('required service: ', requiredService);
                    // dependency is resolved, inject
                    descriptor.unsatisfiedCount--;
                    dep.satisfied = true;

                    let requiredInstance: any = this.servicesById[requiredService.sid].serviceInstance;
                    descriptor.serviceInstance[dep.fieldName] = requiredInstance;                    
                }
            });

            // out && console.log("unsatisfiedCount is now ", descriptor.unsatisfiedCount);
        }
        
        if (descriptor.unsatisfiedCount == 0) {
            // out && console.log(`${descriptor.prototype.name} is now resolved`);
            
            if (descriptor.initMethodName) {
                descriptor.serviceInstance[descriptor.initMethodName]();
            }

            for (var prop in descriptor.serviceInstance) {
                let extPoint: ExtenderConfig = Reflect.getMetadata(Symbols.EXTENSION_POINT, descriptor.serviceInstance, prop);
                if (extPoint) {

                    let pointDesc: ExtensionPointDescriptor = new ExtensionPointDescriptor();
                    pointDesc.methodName = prop;
                    pointDesc.serviceId = descriptor.sid;
                    this.addExtensionPoint(extPoint.name, pointDesc);

                    let extenders: ExtenderDescriptor[] = this.extenders[extPoint.name];
                    if (extenders) {
                        extenders.forEach(ext => {
                            let extInstance: any = this.servicesById[ext.serviceId].serviceInstance;
                            descriptor.serviceInstance[prop](ext.config, extInstance, ext.methodName);
                        });
                    }
                }

                let extender: ExtenderConfig = Reflect.getMetadata(Symbols.EXTENDER, descriptor.serviceInstance, prop);
                if (extender) {

                    let ext: ExtenderDescriptor = new ExtenderDescriptor();
                    ext.methodName = prop;
                    ext.serviceId = descriptor.sid;
                    ext.config = extender.config;
                    this.addExtender(extender.name, ext);

                    let points: ExtensionPointDescriptor[] = this.extensionPoints[extender.name];
                    if (points) {
                        points.forEach(point => {
                            let pointInstance:any = this.servicesById[point.serviceId].serviceInstance;
                            pointInstance[point.methodName](extender.config, descriptor.serviceInstance, prop);
                        });
                    }
                }
            }

            // now start traversing the dependency graph to see if any existing services
            // can now be resolved.
            let interfaceName: string = descriptor.prototype.name;
            if (descriptor.config.implements) {
                interfaceName = descriptor.config.implements[0].name;
            }
            // out = interfaceName === 'ApplicationConfig';
            // out && console.log('interfaceName is ', interfaceName);
            _(this.getServicesDependingOn(interfaceName)).forEach(dep => {
                // out && console.log(dep);
                if (_(visitedDependencies).find(visited => visited.equals(dep))) {
                    return;
                }
                visitedDependencies.push(dep);
                let dependingDesc: ServiceDescriptor = this.servicesById[dep.dependeingServiceSid];
                // out && console.log('depending desc is ', dependingDesc);
                this.resolve(dependingDesc, visitedDependencies);
            });

        }

    }

    addExtender(name: string, extender: ExtenderDescriptor) {
        let extenders = this.extenders[name];
        if (! extenders) {
            extenders = [];
            this.extenders[name] = extenders;
        }
        extenders.push(extender);
    }

    addExtensionPoint(name: string, extensionPoint: ExtensionPointDescriptor) {
        let points = this.extensionPoints[name];
        if (! points) {
            points = [];
            this.extensionPoints[name] = points;
        }
        points.push(extensionPoint);
    }
}