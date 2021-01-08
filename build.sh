rm -r build
rm -r dist

npm i -g yarn
npm i -g typescript
yarn
tsc
cp -r src/assets build/

mkdir build/linux
mkdir build/windows

pkg --public --out-dir build/linux -t linux .
pkg --public --out-dir build/windows -t windows .

cp src/sounds/* build/linux/ -r
cp src/sounds/* build/windows/ -r
cp src/sounds/* build/ -r

# Chrome
wget -O build/windows/chromium.zip https://commondatastorage.googleapis.com/chromium-browser-snapshots/Win/818858/chrome-win.zip
wget -O build/linux/chromium.zip https://commondatastorage.googleapis.com/chromium-browser-snapshots/Linux_x64/818858/chrome-linux.zip

unzip build/windows/chromium.zip -d build/windows
unzip build/linux/chromium.zip -d build/linux

rm build/**/chromium.zip

# VLC only gets bundled for windows, it is assumed you have vlc installed if you run it on linux
wget -O build/windows/vlc.zip https://ftp2.nluug.nl/mediaplayer/vlc/vlc/3.0.11/win32/vlc-3.0.11-win32.zip
unzip build/windows/vlc.zip -d build/windows
mv build/windows/vlc-* build/windows/vlc
rm build/windows/vlc.zip

mkdir dist/

zip -r dist/prolificclaimer-windows.zip build/windows
zip -r dist/prolificclaimer-linux.zip build/linux

echo "Build completed"