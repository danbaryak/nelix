import { BaseService, ServiceDefinition, ServiceDependency } from '.';
var express = require('express');
var SocketIO = require('socket.io');
var path = require('path');
var http = require('http');
var bodyParser = require('body-parser');
var helmet = require('helmet');

export abstract class ApplicationConfig extends BaseService {
    abstract configure(app: Application): void;
}

/**
 * An express application.
 */
@ServiceDefinition({})
export class Application extends BaseService {
  
  @ServiceDependency({ class: ApplicationConfig })
  public appConfig: ApplicationConfig = null;

  app: any;
  httpServer: any;
  sio: any;
  router: any;

  port: number = 5000;

  /**
   * Serves static content.
   * 
   * @param pathToUse The path under which the location will be mounted.
   * @param location The location to serve
   */
  serveStatic(pathToUse: string, location: string): void {
      this.app.use(pathToUse, express.static(location));
  }

  /**
   * Sets the HTTP port to use.
   */
  setPort(port: number): void {
    this.port = port;
  }

  serve(location: string): void {
      this.app.use(express.static(location));
  }

  redirectByDefaultTo(dir: any, location: any): void {
    this.app.all('*', (req: any, res: any) => {
        res.status(200).sendFile(path.join(dir, location));
    });    
  }

  init(): void{
    this.info("Initializing application");

    this.app = express();

    this.app.use(bodyParser.urlencoded({
      extended: true
    }));

    this.app.use(bodyParser.urlencoded({ extended: false }));
    this.app.use(bodyParser.json());
    this.app.use(helmet());
    
    let httpServer = http.createServer(this.app);

    this.httpServer = require('http').Server(this.app);

    this.sio = SocketIO();
    this.sio.attach(httpServer);

    this.appConfig.configure(this);

    this.httpServer.listen(this.port);
  }

}
