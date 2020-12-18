import prompts from 'prompts'


export default class CommandLine {
    static prompt(question: string, invisible: boolean): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const response = await prompts({
                type: invisible ? "password" : "text",
                name: 'prompt',
                message: question
            })

            resolve(response.prompt)
        })
    }
}