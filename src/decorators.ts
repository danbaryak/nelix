import { DependencyManager } from '.';
import "reflect-metadata";
import { Method } from './resource.handler';
import * as _ from 'lodash';

export class Symbols {
    static DEPENDENCY: string = 'dependency'; 
    static INIT_METHOD: string = 'init-method';
    static COMMAND: string = 'command';
    static RESOURCE: string = 'resource';
    static EXTENDER: string = 'extender';
    static EXTENSION_POINT: string = 'extension-point';
}

export interface ServiceConfiguration {
    priority?: number;
    properties?: { [key: string] : any };
    implements?: any[];
}

export interface ServiceDependencyConfig {
    class: any;
}

export function ServiceDefinition(config?: ServiceConfiguration) {
    config = config || {};
    return function(target: any) {
        DependencyManager.instance.registerService(target, config);
    }
}

export function ServiceDependency(config: ServiceDependencyConfig) {
    return Reflect.metadata(Symbols.DEPENDENCY, config);
}

export function Init() {
    return Reflect.metadata(Symbols.INIT_METHOD, true);
}

export interface CommandConfig {
    name: string;
    description: string;
}

export interface ExtenderConfig {
    config?: any;
    name: string;
}

export interface ExtensionPointConfig {
    name: string;
}

export interface ResourceConfig {
    method: Method;
    url: string;
}

export function ShellCommand(config: CommandConfig) {
    return Reflect.metadata(Symbols.EXTENDER, { name: 'shell', config: config });
}

export function Extender(config: ExtenderConfig) {
    return Reflect.metadata(Symbols.EXTENDER, config);
}

export function ExtensionPoint(config: ExtensionPointConfig) {
    return Reflect.metadata(Symbols.EXTENSION_POINT, config);
}

export function Resource(config: ResourceConfig) {
    return Reflect.metadata(Symbols.EXTENDER, { name: 'resource', config: config });
}
