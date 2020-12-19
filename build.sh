npm i -g yarn
npm i -g typescript
yarn
tsc
cp -r src/assets build/

mkdir build/linux
mkdir build/windows

pkg --public --out-dir build/linux -t linux .
pkg --public --out-dir build/windows -t windows .

cp src/assets build/linux/ -r
cp src/assets build/windows/ -r