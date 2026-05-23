pipeline {
    agent any

    tools {
        jdk 'jdk21'
    }

    stages {
        stage('Git Test') {
            steps {
                bat 'git --version'
            }
        }
        stage('Build') {
            steps {
                dir('infrastructure/api-gateway') {
                    bat 'mvn clean package'
                }
                dir('infrastructure/discovery-service') {
                    bat 'mvn clean package'
                }
                dir('services') {
                    bat 'mvn clean package' 
                }
            }
        }
        stage('Test') {
            steps {
                dir('infrastructure/api-gateway') {
                    bat 'mvn test'
                }
                dir('infrastructure/discovery-service') {
                    bat 'mvn test'
                }

                dir('services') {
                    bat 'mvn test'
                }
            }
        }
        stage('Run Docker Build') {
            steps {
                bat 'docker compose up -d --build'
            }
        }
    }
}