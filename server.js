const express = require('express');
const app = express();
const path = require('path');
const http = require('http');
const server = http.createServer(app);
const port = process.env.PORT || 5000

const { Server } = require('socket.io');
const e = require('express');
wine_questions = require('./wineQuestions.json')

const io = new Server(server, {    origins: [""],
        handlePreflightRequest: (req, res) => {            res.writeHeader(200, {
                "Access-Control-Allow-Origin": ""            })
            res.end()        }, 
        credentials:true});


server.listen(5000, function () {
    console.log("server started at port 5000");
});

app.use(express.static('public'));
app.use(express.static(path.join(__dirname, "build")))
app.get('/', function(req, res){
    res.sendFile(path.join(__dirname, "index.html"))
})
let questionIndex = 0
let number_of_attemps = 0
let userAnswers = []
io.on("connection", (socket) => {
    console.log(`connect ${socket.id}`);

    socket.on("disconnect", (reason) => {
        console.log(`disconnect ${socket.id} due to ${reason}`);
        questionIndex = 0
        number_of_attemps = 0
        userAnswers = []
    });
    socket.emit("answer", "You can enter skip to skip a question")
    socket.emit("answer", wine_questions.questions[questionIndex].question)
    questionIndex++
    socket.on("question", (data) => {
        let message = data
        message = message.trim()
        message = message.replaceAll(/\s+/g," ")
        message = message.toLowerCase()
        if(message.includes("%"))
            {
                console.log("replacing")
                message = message.replaceAll("%", " percent")
            }
        message = message.replaceAll(/[^\w ]+/g,"")
        if (message === 'skip')
        {
            socket.emit("answer", "No Problem, here is the next question: " + "\n" + wine_questions.questions[questionIndex].question) 
            userAnswers[questionIndex] = "0"
            questionIndex++   
        }
        else
        {
            let answer = keywordSpotting(message,  wine_questions.questions[questionIndex-1].phrases)
            if(answer === -1)
                {
                    //we return -1 when keyword spotting fails, thus we increment the number of attempts
                    //the user is taking to answer the question, if they cannot answer properly, we will restart.
                    number_of_attemps++
                    if(number_of_attemps > 3)
                    {
                        restartMessage = "Due to repeated failed attempts, the bot will restart. \nThank you for your cooperation."
                        socket.emit("answer", restartMessage)
                        questionIndex = 0
                        number_of_attemps = 0
                        socket.emit("answer",  wine_questions.questions[questionIndex].question)
                        questionIndex++
                    }
                    else{
                        reAnswerMessage = "Sadly, I couldn't understand that. \nCan you try answering it differently?"
                        socket.emit("answer", reAnswerMessage)
                        questionMessage =  wine_questions.questions[questionIndex-1].question
                        socket.emit("answer",  questionMessage)  
                        }
                }
                else{
                    socket.emit("answer", "Your answer was: " + answer)
                    socket.emit("answer", wine_questions.questions[questionIndex].question) 
                    userAnswers[questionIndex-1] = answer
                    console.log(userAnswers)
                    questionIndex++
                }
        }
    });
});
function keywordSpotting(message, ...phrases)
{
    messageArray = message.split(" ")
    let phraseNumber = 0
    if (messageArray.length > 1)
    {
        for(var i = 0;i < phrases[0].length;i++)
        {
            let phr = phrases[0][i].split(" ")
            if(phr.length <= message.length)
            {
                for(var j = 0;j < (messageArray.length - phr.length);j++)
                {
                    let phrToCom= ""
                    for(var k = 0; k <=(phr.length+j);k++)
                    {
                        phrToCom += messageArray[k] + " "
                    }
                    console.log(phrToCom + " user phrase")
                    console.log(phrases[0][i] + " keyword phrase")
                    if(phrToCom.includes(phrases[0][i]))
                    {
                        if(wine_questions.questions[questionIndex-1].answerBeforePhraseIndex != 0)
                        {
                            phraseMatchIndex = phrToCom.indexOf(phrases[0][i])
                            firstAnswerTill = wine_questions.questions[questionIndex-1].answerBeforePhraseIndex
                            if(phraseNumber < firstAnswerTill)
                            {
                                return phrToCom.substring(0, phraseMatchIndex)
                            }
                            else
                            {
                                return phrToCom.substring(phraseMatchIndex+phrases[0][i].length, phrToCom.indexOf(" ", phraseMatchIndex+phrases[0][i].length+1))
                            }
                        }
                        else
                        {
                            return phrases[0][i]  
                        }                          
                    }
                }
            }
            phraseNumber++
        }
        return -1
    }
    else if(messageArray.length === 1)
    {
        if(questionIndex-1 === 0 || questionIndex-1 === 4)
        {
            return messageArray[0]
        }
        else
        {
            for(var i = 0;i < phrases[0].length;i++)
            {
                if(messageArray.includes(phrases[0][i]))
                {
                    return phrases[0][i]
                }   
            }
            return -1
        }
    }
    else
    {
        return -1
    }
}

