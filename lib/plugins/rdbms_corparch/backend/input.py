# Copyright (c) 2018 Charles University, Faculty of Arts,
#                    Institute of the Czech National Corpus
# Copyright (c) 2018 Tomas Machalek <tomas.machalek@gmail.com>
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; version 2
# dated June, 1991.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

import json
import re

from typing import List, Dict, Any, IO, Optional


class InstallJsonMetadata(object):

    def __init__(self):
        self.database: Optional[str] = None
        self.label_attr: Optional[str] = None
        self.id_attr: Optional[str] = None
        self.desc: Optional[int] = None
        self.keywords: List[str] = []
        self.featured: bool = False

    def update(self, data):
        for attr in list(self.__dict__.keys()):
            if attr == 'featured':
                self.featured = bool(data.get('featured', []))
            else:
                setattr(self, attr, data.get(attr, None))


class InstallJsonReference(object):

    def __init__(self):
        self.default: Optional[str] = None
        self.articles: List[str] = []
        self.other_bibliography: Optional[str] = None

    def update(self, data):
        self.default = data.get('default', None)
        self.articles = data.get('articles', [])
        self.other_bibliography = data.get('other_bibliography', None)


class InstallJson(object):
    """
    InstallJson represents a model for
    a corpus installation JSON file used
    to add new (or replace existing) corpus
    to KonText. It is basically derived
    from default_corparch XML schema.
    """

    def __init__(self):
        self.ident: Optional[str] = None
        self.sentence_struct: Optional[str] = None
        self.tagset: Optional[str] = None
        self.web: Optional[str] = None
        self.collator_locale: Optional[str] = None
        self.speech_segment: Optional[str] = None
        self.speaker_id_attr: Optional[str] = None
        self.speech_overlap_attr: Optional[str] = None
        self.speech_overlap_val: Optional[str] = None
        self.use_safe_font: bool = False
        self.metadata: InstallJsonMetadata = InstallJsonMetadata()
        self.reference: InstallJsonReference = InstallJsonReference()
        self.token_connect: List[str] = []
        self.kwic_connect: List[str] = []

    @staticmethod
    def create_sorting_values(ident: str):
        srch = re.match(r'(?i)^intercorp(_v(\d+))?_\w+$', ident)
        if srch:
            if srch.groups()[0]:
                return 'intercorp', int(srch.groups()[1])
            else:
                return 'intercorp', 6

        srch = re.match(r'(?i)^oral_v(\d+)$', ident)
        if srch:
            return 'oral', int(srch.groups()[0])

        srch = re.match(r'(?i)^oral(\d{4})$', ident)
        if srch:
            return 'oral', int(srch.groups()[0]) - 3000
        return ident, 1

    def update(self, fr):
        data = json.load(fr)
        for attr in list(self.__dict__.keys()):
            if attr == 'metadata':
                self.metadata.update(data.get(attr, {}))
            elif attr == 'reference':
                self.reference.update(data.get(attr, {}))
                pass
            else:
                setattr(self, attr, data.get(attr, None))

    def to_dict(self) -> Dict[str, Any]:
        ans = {}
        ans.update(self.__dict__)
        ans['group_name'], ans['version'] = self.create_sorting_values(self.ident)
        ans['metadata'] = {}
        ans['metadata'].update(self.metadata.__dict__)
        ans['reference'] = {}
        ans['reference'].update(self.reference.__dict__)
        return ans

    def get_group_name(self) -> str:
        ans, _ = self.create_sorting_values(self.ident)
        return ans

    def get_version(self) -> int:
        _, ans = self.create_sorting_values(self.ident)
        return ans

    def write(self, fw: IO[Any]):
        return json.dump(self.to_dict(), fw,  indent=4)
