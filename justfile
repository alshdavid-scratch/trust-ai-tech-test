set windows-shell := ["pwsh", "-NoLogo", "-NoProfileLoadTime", "-Command"]

build:
  cd client && just build
