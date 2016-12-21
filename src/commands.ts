import { ServiceDefinition, ShellCommand, DependencyManager, ServiceDescriptor, ExtensionPoint, Extender } from '.';
import * as _ from 'lodash';

@ServiceDefinition({})
export class TestCommands {

    @ShellCommand({ name: 'dm', description: 'Show a summary of all dependencies'})
    showDependencies(req: any, res: any): void {
        _.each(DependencyManager.instance.servicesById, (descriptor: ServiceDescriptor) => {
            res.cyan(JSON.stringify({
                sid: descriptor.sid,
                type: descriptor.prototype.name,
                resolved: descriptor.unsatisfiedCount == 0
            }, null, 2)).ln();
        });
        res.prompt();
    }

    @ShellCommand({ name: 'dm by type', description: 'Show a summary of all dependencies'})
    servicesByType(req: any, res: any): void {
        res.cyan(JSON.stringify(Object.keys(DependencyManager.instance.servicesByType))).ln();
        res.prompt();
    }
    
    @ShellCommand({ name: 'dm wtf', description: 'Show the root cause of dependency issues' })
    doSomethingElse(req: any, res: any): void {
        res.yellow('this is something').ln();
        res.prompt();
    }
}


@ServiceDefinition({})
export class FirstTest {
    
    @Extender({name: 'test'})
    doSomething(): void {
        
    }

}

@ServiceDefinition({})
export class PointTest {

    @ExtensionPoint({ name: 'test' })
    addExtension(config: any, serviceInstance: any, prop: any) {
        serviceInstance[prop]();
    }
}

@ServiceDefinition({})
export class AnotherTest {
    
    @Extender({name: 'test'})
    doSomething(): void {
        
    }

}