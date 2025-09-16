@echo off
echo Starting Sports Betting Backend...
cd soccer_backend

echo Creating .env file...
echo DATABASE_URL=sqlite:///./test.db > .env
echo TEST_DATABASE_URL=sqlite:///./test.db >> .env
echo SECRET_KEY=your-super-secret-key-here-development-only >> .env
echo SMTP_USERNAME=your-email@gmail.com >> .env
echo SMTP_PASSWORD=your-app-password >> .env
echo SMTP_FROM_EMAIL=your-email@gmail.com >> .env
echo DEBUG=True >> .env
echo APP_NAME=Soccer Betting API >> .env
echo APP_VERSION=1.0.0 >> .env

echo Starting Python backend...
python main.py
pause
