import { ResourceConfig, BaseService, ServiceDefinition, ExtensionPoint, Resource } from '.';
import * as express from 'express';

export type Method = "GET" | "POST" | "DELETE" | "PUT";

interface ResourceDescriptor {
    config: ResourceConfig;
    serviceInstance: any;
    funcName: string;
}

/**
 * Handles registration of restful resources with the express server.
 */
@ServiceDefinition({})
export class ResourceHandler extends BaseService {

    private resources: { [key: string] : ResourceDescriptor; } = {};

    @ExtensionPoint({ name: 'resource' })
    registerResource(serviceInstance: any, funcName: string, config: ResourceConfig): void {
        this.debug(`resource added ${config}`)
        this.resources[config.url] = { config, serviceInstance, funcName };
    }

    private handlerFactory(serviceInstance: any, key: string): express.RequestHandler {
        return (req, res, next) => {
            let result: any = serviceInstance[key](req, res, next);
            // try to resolve promise
            if (result && result instanceof Promise) {

                result.then((value: any) => {
                    if (value && !res.headersSent) {
                        res.send(value);
                    }
                })
                .catch((error: any) => {
                    next(error);
                });

            } else if (result && !res.headersSent) {
                res.send(result);
            }
        };
    }
}
