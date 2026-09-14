import unittest
from count_notes import count_notes
class NoteCounterTest(unittest.TestCase):
    def count(self,body,header=''):
        return count_notes('AudioOffset:0\n'+header+'-\ntiming(0,120,4);\n'+body)
    def test_taps_and_arctaps(self):
        self.assertEqual(self.count('(0,1);\narc(0,1000,0,1,s,1,1,0,none,true)[arctap(500)];'),2)
    def test_connected_arcs(self):
        self.assertEqual(self.count('arc(0,1000,0,0.5,s,1,1,0,none,false);\narc(1000,2000,0.5,1,s,1,1,0,none,false);'),7)
    def test_noinput(self):
        self.assertEqual(self.count('timinggroup(noinput){\ntiming(0,120,4);\n(0,1);\n};'),0)
    def test_density_and_bpm(self):
        self.assertEqual(self.count('hold(0,1000,1);'),3)
        self.assertEqual(self.count('hold(0,1000,1);','TimingPointDensityFactor:2\n'),7)
        self.assertEqual(self.count('timing(500,240,4);\nhold(1000,2000,1);'),7)
    def test_unknown_rejected(self):
        with self.assertRaises(ValueError):self.count('unknown(1,2);')
if __name__=='__main__': unittest.main()
