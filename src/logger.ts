import { ServiceDefinition, ServiceDependency, Init, ShellCommand } from '.';

export type Level = "ERROR" | "WARN" | "INFO" | "DEBUG";

export const Level = {
    ERROR: "ERROR" as Level,
    WARN: "WARN" as Level,
    INFO: "INFO" as Level,
    DEBUG: "DEBUG" as Level
}

export class Logger {
    log(level: Level, message: string) {};
    setLevel(level: Level) {};
}

@ServiceDefinition({ implements: [ Logger ] })
export class ConsoleLogger implements Logger {
    
    lines: string[] = [];

    level: Level = Level.INFO;
    enabled: boolean = false;

    log(level: Level, message: string) {
        let formattedMessage: string = `${level}\t| ${new Date().toISOString()}\t| ${message}`;
        if (this.enabled) {
            console.log(formattedMessage)
        }
        this.lines.push(formattedMessage);
    }
    
    setLevel(level: Level) {
        this.level = level;
    }
    
    @ShellCommand({ name: 'log all', description: 'Show entire log output'})
    showLog(req: any, res: any): void {
        this.lines.forEach(line => {
            if (line.indexOf('ERROR') === 0) {
                res.red(line).ln();
            } else if (line.indexOf('WARN') === 0) {
                res.yellow(line).ln();
            } else if (line.indexOf('INFO') == 0) {
                res.white(line).ln();
            } else {
                res.cyan(line).ln();
            }
        });
        res.prompt();
    }

    @ShellCommand({ name: 'log output off', description: 'Turn off console logging'})
    disableLogger(req: any, res: any): void {
        this.enabled = false;
    }

    @ShellCommand({ name: 'log output on', description: 'Turn on console logging'})
    enableLogger(req: any, res: any): void {
        this.enabled = true;
    }
}

export abstract class BaseService {

    @ServiceDependency({ class: Logger })
    logger: Logger = null;

    @Init()
    initService(): void {
        this.debug('Service initialised');
        if (this.init) {
            this.init();
        }
    }

    private log(level: Level, message: string) {
        let compName: string = (this as any).constructor.name;
        this.logger.log(level, `${compName}\t| ${message}`);
    }

    protected info(message: string) {
        this.log(Level.INFO, message);
    }

    protected debug(message: string) {
        this.log(Level.DEBUG, message);
    }

    protected error(message: string) {
        this.log(Level.ERROR, message);
    }

    protected warn(message: string) {
        this.log(Level.WARN, message);
    }

    init(): void {
    }
}

@ServiceDefinition({})
export class HelperService extends BaseService {

    init(): void {
        this.info('This is a message from the helper');
    }

    saySomething(): string {
        return 'well something';
    }
}

@ServiceDefinition({})
export class ExampleTask extends BaseService {

    @ServiceDependency({ class: HelperService})
    helperService: HelperService = null;

    init(): void {
        this.debug(`Message from helper: ${this.helperService.saySomething()}`);
    }

    doSomething(something: string): void {
        this.info(`I was instructed to ${something}`);
        this.warn(`Consider this a warning`);
    }
}

@ServiceDefinition({})
export class SomeOtherService extends BaseService {

    @ServiceDependency({ class: ExampleTask })
    exampleTask: ExampleTask = null;

    init(): void {
        this.exampleTask.doSomething('go swim');
    }

}
