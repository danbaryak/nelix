declare var require: any;
declare var __dirname: string;

import { ServiceDependency, Logger,ServiceDefinition, BaseService, CommandConfig, ExtensionPoint, Init, ShellCommand } from '.';

var fs = require('fs');
var shell = require('shell');

@ServiceDefinition({})
export class ShellHandler extends BaseService {

    private app: any;

    @Init()
    init(): void {
        this.app = new shell({ workspace: __dirname });;
        this.app.configure(() => {
            this.app.use(shell.history({shell: this.app}));
            this.app.use(shell.completer({shell: this.app}));
            this.app.use(shell.router({shell: this.app}));
            this.app.use(shell.help({shell: this.app, introduction: true}));
            this.app.use(shell.error({shell: this.app}));
        });
    }

    @ExtensionPoint({ name: 'shell' })
    registerCommand(config: CommandConfig, instance: any, functionName: string) {
        this.app.cmd(config.name, config.description, (req: any, res: any, next: any) => {
            instance[functionName](req, res);
            res.prompt();
        })
    }
}
