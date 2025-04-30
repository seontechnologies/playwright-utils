import { server } from './server-config'

const port = process.env.PORT || 3001

server.listen(port, () => console.log(`Listening on port ${port}...`))
