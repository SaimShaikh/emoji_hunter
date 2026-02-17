🧱 Architecture Overview

```bash
GitHub Repo
   ↓ (push)
GitHub Actions
   ├── Build & Test (Node.js)
   ├── SonarCloud Scan
   ├── Docker Build
   ├── Trivy Image Scan
   ├── Push to Docker Hub
   └── Deploy on AWS EC2
                ↓
        Docker Container (Port 80)
```

🛠 Tech Stack

- Frontend: React + Vite

- CI/CD: GitHub Actions

- Security: Trivy

- Code Quality: SonarCloud

- Containerization: Docker

- Cloud: AWS EC2 (Ubuntu)

- Registry: Docker Hub


 📁 Repository Structure

 ```bash
emoji_hunter/
├── src/
├── Dockerfile
├── vite.config.js
├── package.json
├── .github/workflows/ci-cd.yml
└── README.md
```

☁️ Step 1: Create AWS EC2 Instance

Launch EC2 instance

OS: Ubuntu 22.04 / 24.04

Instance type: t2.micro

2 Security Group – Inbound Rules

| Type | Port | Source    |
| ---- | ---- | --------- |
| SSH  | 22   | 0.0.0.0/0 |
| HTTP | 80   | 0.0.0.0/0 |


3 Connect via SSH:
`ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>`

🐳 Step 2: Install Docker on EC2

```bash
sudo apt update
sudo apt install docker.io -y
sudo usermod -aG docker ubuntu
newgrp docker
docker --version
```

🏃 Step 3: Setup GitHub Self-Hosted Runner on EC2
Go to GitHub → Repo → Settings → Actions → Runners

- Add Self-Hosted Runner

- Run the given commands on EC2

- Runner labels:

- self-hosted

- Linux

<img width="3313" height="1487" alt="image" src="https://github.com/user-attachments/assets/27b548d6-1088-47e7-a2a4-41b5d63f9f48" />

<img width="2879" height="1714" alt="image" src="https://github.com/user-attachments/assets/197dc2de-ce6a-4d63-8211-0c9281ffd51d" />

- just press enter 3 times
- Then ./run.sh and you will see Connected to GitHub 


🐳 Step 4: Docker Hub Setup

- Generate Access Token

- Scope: Read & Write

🔍 Step 5: SonarCloud Setup

- Go to https://sonarcloud.io

- Login using GitHub

- Create a new project

<img width="3266" height="2014" alt="image" src="https://github.com/user-attachments/assets/81d92512-925e-40ea-9cbc-075c57c0ea14" />
<img width="3198" height="2012" alt="image" src="https://github.com/user-attachments/assets/54bc41cb-1e3a-4ae4-a239-d3a3a9c16140" />
<img width="3206" height="2016" alt="image" src="https://github.com/user-attachments/assets/63fec43f-8076-4e25-a7d3-c647cc0ce7b6" />
<img width="3207" height="1410" alt="image" src="https://github.com/user-attachments/assets/69f8e16e-a83c-4ef8-b371-537f8c68339d" />
<img width="3257" height="1895" alt="image" src="https://github.com/user-attachments/assets/5da4f01d-80c4-4e04-8d3f-494ed44b1e44" />
<img width="3244" height="1996" alt="image" src="https://github.com/user-attachments/assets/3d79a1c3-8461-4603-84be-2a7f96954105" />
<img width="3330" height="2002" alt="image" src="https://github.com/user-attachments/assets/f07ea759-cdf0-4e06-81b9-0e09e82c11c8" />
<img width="3323" height="2002" alt="image" src="https://github.com/user-attachments/assets/370d4924-f46f-4d79-b591-2cc4b9ec49cb" />




Note:

- Organization Key

- Project Key

- SONAR_TOKEN

Step 6: Now Sonar Cloud Provide you sonar-project.properties so create one file in root location and Peste Data in to that file

🔐 Step 7: GitHub Secrets Configuration

Go to GitHub → Repo → Settings → Secrets → Actions → Repository secrets

Add the following:

| Secret Name          | Description             |
| -------------------- | ----------------------- |
| `DOCKERHUB_USERNAME` | Docker Hub username     |
| `DOCKERHUB_TOKEN`    | Docker Hub access token |
| `SONAR_TOKEN`        | SonarCloud token        |


<img width="1736" height="489" alt="image" src="https://github.com/user-attachments/assets/943acd9e-00f8-44f1-b937-7b955a149ab5" />


### Now all setup is done

Step 8 : Creare .github/workflows/ in your root location 

```bash
name: EC2 CI-CD Pipeline

on:
  push:
    branches:
      - "**"
  pull_request:

jobs:
  clone:
    runs-on: self-hosted
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

  build_test_scan:
    runs-on: self-hosted
    needs: clone
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test || echo "No tests found"

      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@v2
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
        with:
          args: >
            -Dsonar.projectKey=<Replace With Your Properties >
            -Dsonar.organization=<Replace With Your Properties >
            -Dsonar.sources=src

  docker_build_scan_push:
    runs-on: self-hosted
    needs: build_test_scan
    steps:
      - uses: actions/checkout@v4

      - name: Docker Hub Login
        uses: docker/login-action@v3
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}

      - name: Build Docker image
        run: docker build -t emoji_hunter:latest .

      - name: Trivy Scan (local image)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: emoji_hunter:latest
          severity: HIGH,CRITICAL
          exit-code: 0     # change to 1 for strict blocking
          format: table

      - name: Tag Docker image
        run: docker tag emoji_hunter:latest ${{ secrets.DOCKERHUB_USERNAME }}/emoji_hunter:latest

      - name: Push Docker image
        run: docker push ${{ secrets.DOCKERHUB_USERNAME }}/emoji_hunter:latest

  deploy:
    runs-on: self-hosted
    needs: docker_build_scan_push
    steps:
      - name: Stop old container
        run: |
          docker stop emoji_hunter || true
          docker rm emoji_hunter || true

      - name: Run new container
        run: |
          docker run -d \
            --name emoji_hunter \
            -p 80:5173 \
            ${{ secrets.DOCKERHUB_USERNAME }}/emoji_hunter:latest

      - name: Show Application URL
        run: |
          PUBLIC_IP=$(curl -s http://checkip.amazonaws.com)
          echo "===================================="
          echo "🚀 Application deployed successfully"
          echo "👉 Access URL: http://$PUBLIC_IP"
          echo "===================================="
```

Step 9. Push this on you Github so Github Actions start working inside your repo go to Actions ypu will find 

<img width="2609" height="618" alt="image" src="https://github.com/user-attachments/assets/b8ec050e-eed4-4e0b-9fd1-f88ff36578a1" />

Step 10. In console output you will get url to access app 

<img width="3337" height="2007" alt="image" src="https://github.com/user-attachments/assets/04ea08bf-501c-4375-af35-3b0b7b488aa9" />

<img width="2714" height="1554" alt="image" src="https://github.com/user-attachments/assets/c45214ee-1831-4665-a0d0-acaadf58b766" />

<img width="3341" height="2016" alt="image" src="https://github.com/user-attachments/assets/abc801e0-f1b4-4375-9b8b-5acb3f895a6c" />
<img width="3327" height="2018" alt="image" src="https://github.com/user-attachments/assets/9882f5f5-cf9d-4df2-8da0-d79713ae7c81" />

Step 10 . You can SonarCLoud and Trivy Check Reports 

<img width="3336" height="2013" alt="image" src="https://github.com/user-attachments/assets/48befbd1-50c5-4962-b43f-8e0d7411b3ad" />
<img width="3243" height="2014" alt="image" src="https://github.com/user-attachments/assets/f4ce6f0c-9faa-4983-bb6f-8dfcef1c459f" />
