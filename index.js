const { app, session, BrowserWindow } = require('electron');

// TODO: Remove in electron 9
app.allowRendererProcessReuse = true;

function createWindow() {
  session.defaultSession.cookies.set({
    url: 'https://www.moh.gov.bh',
    name: 'Lang',
    value: 'en-GB',
    secure: true,
  })
    .catch(console.error);

  // Create the browser window.
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // and load the index.html of the app.
  win.loadFile('src/index.html');
}

app.whenReady().then(createWindow);
