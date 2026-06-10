import { Router } from 'express'
import {
  analyze,
  list,
  getOne,
  history,
  compare,
  remove,
} from '../controllers/profileController.js'

const router = Router()

router.post('/', analyze) // body: { username }, optional ?refresh=true
router.get('/', list) // all stored profiles (pagination/sort/search)
router.get('/compare', compare) // ?a=userA&b=userB  (must precede /:username)
router.get('/:username/history', history) // snapshots over time
router.get('/:username', getOne) // single stored profile
router.delete('/:username', remove) // remove a stored profile

export default router
