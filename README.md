This is an example of how SQLite can be used inside a hybrid mobile application created 
using the Ionic framework, with Angular as frontend. 

The SQLite community plugin is used to work with a local SQLite database.
A local database is useful to store structured information locally, on the device.

The default UI components from Ionic where used to build the UI.

**References**

- [Ionic framework website](https://ionicframework.com)
- [Main Ionic website](https://ionic.io)
- [Capacitor website](https://capacitorjs.com)

**Some notices**

- Capacitor is an open source native runtime for web native apps. This allows our HTML, CSS and JS to be packaged into 
an app and interact with system components, like sending notifications, accessing the camera and files (with sufficient permissions, of course).


- The Ionic framework is a mobile SDK for the web. It's UI toolkit can help to create mobile applications. 
It's components adjust to the native components on IOS and Android, so apps have a familliar look for users. 
The Ionic framework utilizes Capacitor. Cordova was used in ealier versions of ionic and is consideren legacy now.


- Ionic identifier itself as a platform for building and shipping mobile applications.


- The Angular project in this Ionic application uses standalone components.


- This app uses Angular 20, which is not the most recent version (21, at the time of writing). 
Migrating to the most recent Angular version using the VSCode Webnative extension caused some dependency problems.


- The `ionic cap add ios` and `ionic cap add android` commands did not recognize the `capacitor.config.ts` configuration, 
so a JSON file is created instead. The .ts file is kept for reference purposes.


- The NPM package _@capacitor-community/sqlite_ is used to work with SQLite.


- After initializing the project, 
I had to execute npm install _@capacitor/ios_ and npm install _@capacitor/android_ to create the appropriate IOS and Android projects.


- This project is based on a [tutorial](https://devdactic.com/sqlite-ionic-app-with-capacitor). 
This tutorial is outdated, so some things had to be done differently.


- To turn off the opt-out telemetry program from capacitor: `npx cap telemetry off`.


- The SQLite plugin does not have a web implementation, meaning a web browser can not be used 
to run the SQLite capabilities (rendering this whole app unusable). If the frontend has to be used in a webbrowser, 
an alternative option has to be implemented. The [Capawesome SQlite plugin](https://capawesome.io/plugins/sqlite) seems to have web support


- HTTPClient is used to download some mockup data for testing and is registered in _app.modules.ts_.


- In earlier versions of Ionic, plugins like the community SQLite plugin had to be registered in Android's _MainActivity.java_. 
This is not the case anymore in recent versions, plugins are registered in the Android project appropriately by Ionic.


- It is possible to manage multiple databases with CapacitorSQLite by having multiple connections. 
A database name must therefore always be given when interacting with the database.


- A connection is required when interacting with the database, multiple connections 
to the same DB could cause problems when the db is locked by another connection while attempting to interact with it.
