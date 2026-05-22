pipeline {
    agent any

    tools {
        jdk 'jdk21'
    }

    stages {

        stage('Clone') {
            steps {
                git 'https://github.com/saljaoui/buy-01.git'
            }
        }

        stage('Build') {
            steps {
                bat 'mvn clean package'
            }
        }

        stage('Test') {
            steps {
                bat 'mvn test'
            }
        }

        stage('Run Docker Build') {
            steps {
                bat 'docker build -t buy-01-app .'
            }
        }
    }
}